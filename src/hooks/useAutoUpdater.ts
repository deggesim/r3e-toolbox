import { useEffect, useState } from "react";

export const useAutoUpdater = () => {
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    transferred: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!window.electron) return;

    // Listen for download progress updates
    const unsubscribe = window.electron.onUpdateDownloadProgress((data) => {
      setDownloadProgress(data);
    });

    return unsubscribe;
  }, []);

  return {
    downloadProgress,
  };
};
