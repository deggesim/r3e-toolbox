import React from "react";
import { useAutoUpdater } from "../hooks/useAutoUpdater";
import { ProgressBar } from "react-bootstrap";

const formatBytes = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(1) + " MB";
};

export const UpdateProgressNotification: React.FC = () => {
  const { downloadProgress } = useAutoUpdater();

  if (!downloadProgress) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        backgroundColor: "#242424",
        border: "1px solid #3a3a3a",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        zIndex: 9999,
        minWidth: "300px",
      }}
    >
      <h6 style={{ marginBottom: "12px", marginTop: 0, color: "#e0e0e0" }}>
        Downloading Update...
      </h6>
      <ProgressBar
        now={downloadProgress.percent}
        label={`${downloadProgress.percent}%`}
        style={{ marginBottom: "8px" }}
      />
      <small style={{ color: "#95a5a6" }}>
        {formatBytes(downloadProgress.transferred)} /{" "}
        {formatBytes(downloadProgress.total)}
      </small>
    </div>
  );
};
