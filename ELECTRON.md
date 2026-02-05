# Electron Integration for R3E Toolbox

R3E Toolbox now runs as a desktop application using Electron, providing native file system access and better integration with Windows.

## Architecture

### Main Process (`electron/main.mjs`)
- Window management
- File dialog operations (open file, open directory, save file)
- File system operations via IPC handlers:
  - `fs:readFile` - Read file contents
  - `fs:writeFile` - Write file contents
  - `fs:readdir` - List directory contents

### Preload Script (`electron/preload.mjs`)
- Secure IPC bridge between renderer and main process
- Exposes `window.electron` API to React components
- Uses `contextIsolation` and `sandbox` for security

### Type Definitions (`src/types/electron.ts`)
- Global `window.electron` interface for TypeScript support

### Hook (`src/hooks/useElectronAPI.ts`)
- `useElectronAPI()` - Helper hook to access Electron APIs from React components
- Detects if running in Electron or browser
- Throws errors if Electron API not available in browser

## Development

```bash
# Install dependencies
npm install

# Run in development mode (Vite dev server + Electron)
npm run dev

# Run only Vite dev server
npm run dev:vite

# Run only Electron (against built dist/)
npm run dev:electron
```

## Building

```bash
# Build web assets and create Electron app installer
npm run build:electron

# This generates:
# - dist/ - Web assets
# - electron-out/ - Electron app distribution files
# - installers in dist/Electron Releases/
```

## Usage in Components

```typescript
import { useElectronAPI } from '../hooks/useElectronAPI';

function MyComponent() {
  const electron = useElectronAPI();

  const handleSelectFile = async () => {
    const filePath = await electron.openFile({
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (filePath) {
      const content = await electron.readFile(filePath);
      console.log(content);
    }
  };

  const handleSelectFolder = async () => {
    const dirPath = await electron.openDirectory();
    if (dirPath) {
      const files = await electron.readdir(dirPath);
      console.log(files);
    }
  };

  const handleSaveFile = async () => {
    const savePath = await electron.saveFile(
      'export.html',
      [{ name: 'HTML', extensions: ['html'] }]
    );
    if (savePath) {
      await electron.writeFile(savePath, '<html>...</html>');
    }
  };

  return (
    <>
      <button onClick={handleSelectFile}>Open File</button>
      <button onClick={handleSelectFolder}>Select Folder</button>
      <button onClick={handleSaveFile}>Save File</button>
    </>
  );
}
```

## Configuration

### electron-builder (`package.json`)
- App ID: `com.r3e-toolbox.app`
- Product Name: `R3E Toolbox`
- Supported platforms: Windows (NSIS installer + portable)
- Built resources from `public/` directory

### Development vs Production
- Development: Uses `http://localhost:5173` with DevTools open
- Production: Uses local `file://` path to built assets

## Security Considerations

- **Context Isolation**: Enabled (prevents script injection)
- **Sandbox**: Enabled (runs main process in restricted environment)
- **Node Integration**: Disabled (prevents Node API exposure)
- **IPC**: Uses `contextBridge` to safely expose only necessary APIs

## Troubleshooting

### Dev mode doesn't start
- Ensure ports 5173 (Vite) and 3000 (Electron) are available
- Run `npm install` to get all dependencies
- Check that `electron/main.mjs` exists

### App window stays blank
- Check DevTools console (F12 in dev mode)
- Verify Vite is running on `http://localhost:5173`
- Ensure `build.files` in package.json includes all required assets

### File operations fail
- Verify file paths are absolute (not relative)
- Check file permissions
- Ensure file size is reasonable (large files may fail)

## Migration from Web Version

Existing browser-based code continues to work. To enhance with Electron features:

1. Import `useElectronAPI` hook
2. Check `electron.isElectron` before using file APIs
3. Wrap electron calls in try-catch for proper error handling
4. Test in both browser (web mode) and Electron

No breaking changes - the app runs in browser via Vite dev server if Electron APIs aren't used.
