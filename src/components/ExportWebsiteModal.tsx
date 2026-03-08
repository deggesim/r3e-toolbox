/**
 * Export Website Modal Component
 * Provides UI for exporting all championships as a website archive (ZIP or 7z)
 */

import { useState } from "react";
import { Modal, Button, Form, ProgressBar, Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArchive,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import { useChampionshipStore } from "../store/championshipStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { useGameDataStore } from "../store/gameDataStore";
import { useProcessingLogStore } from "../store/processingLogStore";
import { useElectronAPI } from "../hooks/useElectronAPI";
import {
  downloadAndEmbedAssets,
  extractIconUrls,
  type AssetDownloadProgress,
} from "../utils/assetEmbedding";
import {
  exportChampionshipsAsZip,
  exportChampionshipsAs7z,
  type ExportProgress,
} from "../utils/archiveExporter";
import { getDownloadLabel } from "../utils/platformLabels";
import { saveBlobFile } from "../utils/fileSaver";

interface ExportWebsiteModalProps {
  show: boolean;
  onHide: () => void;
}

type ExportFormat = "zip" | "7z";
type ExportStage =
  | "idle"
  | "assets"
  | "html"
  | "archive"
  | "complete"
  | "error";

export const ExportWebsiteModal: React.FC<ExportWebsiteModalProps> = ({
  show,
  onHide,
}) => {
  const [format, setFormat] = useState<ExportFormat>("zip");
  const [stage, setStage] = useState<ExportStage>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  const championships = useChampionshipStore((state) => state.championships);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);
  const gameData = useGameDataStore((state) => state.gameData);
  const addLog = useProcessingLogStore((state) => state.addLog);
  const electronAPI = useElectronAPI();

  const handleExport = async () => {
    if (championships.length === 0) {
      setErrorMessage("No championships available to export");
      setStage("error");
      return;
    }

    try {
      setStage("assets");
      setErrorMessage("");
      setLastExportPath(null);
      setStatusMessage("Preparing export...");
      addLog(
        "info",
        `Starting website archive export as ${format.toUpperCase()}`,
      );

      // Step 1: Extract and download all icon URLs
      setStatusMessage("Downloading leaderboard icons...");
      const iconUrls = extractIconUrls(championships, leaderboardAssets);
      addLog("info", `Found ${iconUrls.length} unique icons to download`);

      const assetMap = await downloadAndEmbedAssets(
        iconUrls,
        (assetProgress: AssetDownloadProgress) => {
          setProgress({
            current: assetProgress.current,
            total: assetProgress.total,
          });
          setStatusMessage(
            `Downloading icons (${assetProgress.current}/${assetProgress.total})...`,
          );
        },
      );

      addLog("success", `Downloaded and embedded ${assetMap.size} icons`);

      // Step 2: Generate HTML and create archive
      setStage("html");
      setStatusMessage("Generating HTML files...");

      const exportOptions = {
        championships,
        assetMap,
        leaderboardAssets: leaderboardAssets
          ? {
              cars: Object.fromEntries(
                leaderboardAssets.cars.map((c) => [c.id, c.iconUrl || ""]),
              ),
              tracks: Object.fromEntries(
                leaderboardAssets.tracks.map((t) => [t.name, t.iconUrl || ""]),
              ),
              carNames: Object.fromEntries(
                leaderboardAssets.cars.map((c) => [c.id, c.name]),
              ),
            }
          : undefined,
        gameData,
        onProgress: (exportProgress: ExportProgress) => {
          setStage(exportProgress.stage);
          setProgress({
            current: exportProgress.current,
            total: exportProgress.total,
          });
          setStatusMessage(exportProgress.message);
        },
      };

      if (format === "zip") {
        // ZIP export (cross-platform)
        const blob = await exportChampionshipsAsZip(exportOptions);
        const fileName = `r3e-championships-${new Date().toISOString().split("T")[0]}.zip`;

        const saved = await saveBlobFile({
          electronAPI,
          filename: fileName,
          blob,
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
          onSaved: (filePath) => setLastExportPath(filePath),
          onCancel: () => {
            addLog(
              "info",
              `${getDownloadLabel(electronAPI.isElectron)} cancelled by user.`,
            );
            setStage("idle");
          },
        });

        if (!saved) {
          return;
        }

        addLog(
          "success",
          `Exported ${championships.length} championships as ZIP (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
        );
        setStatusMessage(`Successfully exported as ${fileName}`);
        setStage("complete");
      } else {
        // 7z export (Electron-only)
        if (!electronAPI.isElectron) {
          throw new Error("7z export is only available in the desktop app");
        }

        // Show save dialog
        const defaultFileName = `r3e-championships-${new Date().toISOString().split("T")[0]}.7z`;
        const savePath = await electronAPI.saveFile(defaultFileName, [
          { name: "7z Archive", extensions: ["7z"] },
        ]);

        if (!savePath) {
          addLog(
            "info",
            `${getDownloadLabel(electronAPI.isElectron)} cancelled by user.`,
          );
          setStage("idle");
          return;
        }

        const archivePath = await exportChampionshipsAs7z({
          ...exportOptions,
          electronAPI: {
            isElectron: true,
            writeFile: electronAPI.writeFile,
            getTempDir: electronAPI.getTempDir,
            deleteDirectory: electronAPI.deleteDirectory,
            create7zArchive: electronAPI.create7zArchive,
          },
          savePath,
        });

        addLog(
          "success",
          `Exported ${championships.length} championships as 7z: ${archivePath}`,
        );
        setLastExportPath(archivePath);
        setStatusMessage(`Successfully exported to ${archivePath}`);
        setStage("complete");
      }
    } catch (error) {
      console.error("Export failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setStage("error");
      addLog("error", `Export failed: ${message}`);
    }
  };

  const handleClose = () => {
    if (stage === "assets" || stage === "html" || stage === "archive") {
      // Don't allow closing during active export
      return;
    }
    setStage("idle");
    setProgress({ current: 0, total: 0 });
    setStatusMessage("");
    setErrorMessage("");
    setLastExportPath(null);
    onHide();
  };

  const handleOpenExportFolder = async () => {
    if (!electronAPI.isElectron || !lastExportPath) {
      return;
    }

    try {
      await electronAPI.showItemInFolder(lastExportPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setStage("error");
      addLog("error", `Failed to open export folder: ${message}`);
    }
  };

  const isExporting =
    stage === "assets" || stage === "html" || stage === "archive";
  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      data-bs-theme="dark"
    >
      <Modal.Header
        closeButton={!isExporting}
        className="bg-dark border-secondary"
      >
        <Modal.Title>
          <FontAwesomeIcon icon={faFileArchive} className="me-2" />
          Export Website Archive
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white">
        {stage === "idle" && (
          <>
            <p>
              Export all {championships.length} championship
              {championships.length === 1 ? "" : "s"} as a self-contained
              website archive with embedded icons (offline-capable).
            </p>

            <Form.Group className="mb-3">
              <Form.Label>Archive Format</Form.Label>
              <Form.Select
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                disabled={isExporting}
              >
                <option value="zip">ZIP (Universal - Works everywhere)</option>
                <option value="7z">
                  7z (Desktop app only - Better compression)
                </option>
              </Form.Select>
              {format === "7z" && !electronAPI.isElectron && (
                <Form.Text className="text-warning d-block mt-2">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2"
                  />
                  7z format requires the desktop app. Switch to ZIP for browser
                  mode.
                </Form.Text>
              )}
            </Form.Group>

            <Alert variant="info" className="mb-0">
              <strong>Archive Contents:</strong>
              <ul className="mb-0 mt-2">
                <li>index.html - Championship list homepage</li>
                <li>
                  All exported files are inside <code>r3e-championships/</code>{" "}
                  ({championships.length} files)
                </li>
                <li>
                  All leaderboard icons embedded as base64 (fully offline)
                </li>
              </ul>
            </Alert>
          </>
        )}

        {isExporting && (
          <>
            <div className="mb-3">
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
              {statusMessage}
            </div>
            <ProgressBar
              now={progressPercentage}
              label={`${progress.current} / ${progress.total}`}
              variant="primary"
              animated
            />
          </>
        )}

        {stage === "complete" && (
          <Alert variant="success">
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            {statusMessage}
          </Alert>
        )}

        {stage === "error" && (
          <Alert variant="danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            <strong>Export Failed:</strong> {errorMessage}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-dark border-secondary">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isExporting}
        >
          {stage === "complete" || stage === "error" ? "Close" : "Cancel"}
        </Button>
        {stage === "idle" && (
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={
              championships.length === 0 ||
              (format === "7z" && !electronAPI.isElectron)
            }
          >
            <FontAwesomeIcon icon={faFileArchive} className="me-2" />
            Export as {format.toUpperCase()}
          </Button>
        )}
        {stage === "complete" && electronAPI.isElectron && lastExportPath && (
          <Button variant="outline-light" onClick={handleOpenExportFolder}>
            <FontAwesomeIcon icon={faFolderOpen} className="me-2" />
            Open Download Folder
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
