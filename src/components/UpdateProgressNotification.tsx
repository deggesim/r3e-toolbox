import React from "react";
import { useAutoUpdater } from "../hooks/useAutoUpdater";
import { ProgressBar } from "react-bootstrap";

export const UpdateProgressNotification: React.FC = () => {
  const { downloadProgress } = useAutoUpdater();

  if (!downloadProgress) {
    return null;
  }

  const formattedSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + " MB";
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 9999,
        minWidth: "300px",
      }}
    >
      <h6 style={{ marginBottom: "12px", marginTop: 0 }}>
        Downloading Update...
      </h6>
      <ProgressBar
        now={downloadProgress.percent}
        label={`${downloadProgress.percent}%`}
        style={{ marginBottom: "8px" }}
      />
      <small style={{ color: "#666" }}>
        {formattedSize(downloadProgress.transferred)} /{" "}
        {formattedSize(downloadProgress.total)}
      </small>
    </div>
  );
};
