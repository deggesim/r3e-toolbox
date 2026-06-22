/**
 * Archive Exporter Utility
 * Creates ZIP and 7z archives containing all championship HTML files with embedded assets
 */

import JSZip from "jszip";
import type { ChampionshipEntry } from "../types/raceResults";
import type { RaceRoomData } from "../types/gameData";
import {
  generateStandingsHTML,
  generateChampionshipIndexHTML,
} from "./htmlGenerator";

export interface ExportProgress {
  stage: "assets" | "html" | "archive";
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export interface ExportOptions {
  championships: ChampionshipEntry[];
  assetMap: Map<string, string>;
  leaderboardAssets?: {
    cars: Record<string, string>;
    tracks: Record<string, string>;
    carNames?: Record<string, string>;
  };
  gameData?: RaceRoomData | null;
  onProgress?: ProgressCallback;
}

/**
 * Generates HTML content for a single championship
 */
const generateChampionshipHTML = (
  championship: ChampionshipEntry,
  assetMap: Map<string, string>,
  leaderboardAssets?: {
    cars: Record<string, string>;
    tracks: Record<string, string>;
    carNames?: Record<string, string>;
  },
  gameData?: RaceRoomData | null,
): string => {
  if (!championship.raceData || championship.raceData.length === 0) {
    throw new Error(`Championship "${championship.alias}" has no race data`);
  }

  return generateStandingsHTML(
    championship.raceData,
    championship.alias,
    leaderboardAssets,
    gameData,
    assetMap,
    championship.pointsSystem,
    championship.pointsPenalties,
  );
};

/**
 * Export all championships as a ZIP archive (cross-platform)
 * @returns Blob containing the ZIP archive
 */
export const exportChampionshipsAsZip = async (
  options: ExportOptions,
): Promise<Blob> => {
  const { championships, assetMap, leaderboardAssets, gameData, onProgress } =
    options;

  if (championships.length === 0) {
    throw new Error("No championships to export");
  }

  const zip = new JSZip();
  const rootFolderName = "r3e-championships";
  const rootFolder = zip.folder(rootFolderName);
  if (!rootFolder) {
    throw new Error("Failed to create export root folder in ZIP");
  }

  // Generate index.html
  onProgress?.({
    stage: "html",
    current: 0,
    total: championships.length + 1,
    message: "Generating index page...",
  });

  const indexHTML = generateChampionshipIndexHTML(championships, assetMap);
  rootFolder.file("index.html", indexHTML);

  // Generate each championship HTML
  for (let i = 0; i < championships.length; i++) {
    const championship = championships[i];

    onProgress?.({
      stage: "html",
      current: i + 1,
      total: championships.length + 1,
      message: `Generating ${championship.alias}...`,
    });

    try {
      const html = generateChampionshipHTML(
        championship,
        assetMap,
        leaderboardAssets,
        gameData,
      );
      rootFolder.file(championship.fileName, html);
    } catch (error) {
      console.error(
        `Failed to generate HTML for ${championship.alias}:`,
        error,
      );
      throw new Error(
        `Failed to generate HTML for "${championship.alias}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Generate ZIP blob
  onProgress?.({
    stage: "archive",
    current: 1,
    total: 1,
    message: "Creating ZIP archive...",
  });

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }, // Maximum compression
  });

  return blob;
};

/**
 * Export all championships as a 7z archive (Electron-only)
 * Requires electron API with file system access
 * @returns Path to the created 7z archive
 */
export const exportChampionshipsAs7z = async (
  options: ExportOptions & {
    electronAPI: {
      isElectron: boolean;
      writeFile: (path: string, content: string) => Promise<void>;
      getTempDir: () => Promise<string>;
      deleteDirectory: (dirPath: string) => Promise<void>;
      create7zArchive: (
        sourceDir: string,
        archivePath: string,
      ) => Promise<void>;
    };
    savePath: string;
  },
): Promise<string> => {
  const {
    championships,
    assetMap,
    leaderboardAssets,
    gameData,
    onProgress,
    electronAPI,
    savePath,
  } = options;

  if (!electronAPI.isElectron) {
    throw new Error("7z export is only available in Electron mode");
  }

  if (championships.length === 0) {
    throw new Error("No championships to export");
  }

  // Use a fixed staging folder name so only r3e-championships is archived
  const tempDir = await electronAPI.getTempDir();
  const exportRoot = `${tempDir}/r3e-championships`;

  try {
    // Clean previous staging content if present
    await electronAPI.deleteDirectory(exportRoot);

    // Generate index.html
    onProgress?.({
      stage: "html",
      current: 0,
      total: championships.length + 1,
      message: "Generating index page...",
    });

    const indexHTML = generateChampionshipIndexHTML(championships, assetMap);
    await electronAPI.writeFile(`${exportRoot}/index.html`, indexHTML);

    // Generate each championship HTML
    for (let i = 0; i < championships.length; i++) {
      const championship = championships[i];

      onProgress?.({
        stage: "html",
        current: i + 1,
        total: championships.length + 1,
        message: `Generating ${championship.alias}...`,
      });

      try {
        const html = generateChampionshipHTML(
          championship,
          assetMap,
          leaderboardAssets,
          gameData,
        );
        await electronAPI.writeFile(
          `${exportRoot}/${championship.fileName}`,
          html,
        );
      } catch (error) {
        console.error(
          `Failed to generate HTML for ${championship.alias}:`,
          error,
        );
        throw new Error(
          `Failed to generate HTML for "${championship.alias}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Create 7z archive
    onProgress?.({
      stage: "archive",
      current: 1,
      total: 1,
      message: "Creating 7z archive...",
    });

    await electronAPI.create7zArchive(exportRoot, savePath);

    // Clean up temp files after successful archive creation
    electronAPI.deleteDirectory(exportRoot).catch(console.warn);
    return savePath;
  } catch (error) {
    // Clean up temp files on error
    electronAPI.deleteDirectory(exportRoot).catch(console.warn);
    throw error;
  }
};

/**
 * Download a blob as a file (browser only)
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
