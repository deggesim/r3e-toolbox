export type ElectronFileAPI = {
  isElectron: boolean;
  saveFile: (
    defaultPath?: string,
    filters?: ElectronDialogFilter[],
  ) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  writeFileBase64?: (filePath: string, base64: string) => Promise<void>;
};

type SaveTextFileOptions = {
  electronAPI: ElectronFileAPI;
  filename: string;
  content: string;
  mimeType: string;
  filters: ElectronDialogFilter[];
  onCancel?: () => void;
  onSaved?: (filePath: string) => void;
};

type SaveBlobFileOptions = {
  electronAPI: ElectronFileAPI;
  filename: string;
  blob: Blob;
  filters: ElectronDialogFilter[];
  onCancel?: () => void;
  onSaved?: (filePath: string) => void;
};

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

export const saveTextFile = async (
  options: SaveTextFileOptions,
): Promise<boolean> => {
  const {
    electronAPI,
    filename,
    content,
    mimeType,
    filters,
    onCancel,
    onSaved,
  } = options;

  if (electronAPI.isElectron) {
    const savePath = await electronAPI.saveFile(filename, filters);
    if (!savePath) {
      onCancel?.();
      return false;
    }

    await electronAPI.writeFile(savePath, content);
    onSaved?.(savePath);
    return true;
  }

  const blob = new Blob([content], { type: mimeType });
  triggerBrowserDownload(blob, filename);
  return true;
};

export const saveBlobFile = async (
  options: SaveBlobFileOptions,
): Promise<boolean> => {
  const { electronAPI, filename, blob, filters, onCancel, onSaved } = options;

  if (electronAPI.isElectron) {
    if (!electronAPI.writeFileBase64) {
      throw new Error("Binary file writing is not available");
    }

    const savePath = await electronAPI.saveFile(filename, filters);
    if (!savePath) {
      onCancel?.();
      return false;
    }

    const base64 = await blobToBase64(blob);
    await electronAPI.writeFileBase64(savePath, base64);
    onSaved?.(savePath);
    return true;
  }

  triggerBrowserDownload(blob, filename);
  return true;
};
