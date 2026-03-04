# Logging System Implementation - R3E Toolbox

## Summary

A complete logging system has been implemented for the R3E Toolbox app. It automatically saves logs to disk in production mode.

## What Was Done

### 1. **Dependency Add**

- ✅ Added `electron-log` v5.2.0 to `package.json`

### 2. **Electron Configuration (main.mjs)**

- ✅ Imported `electron-log` and configured it to save under `AppData\Roaming\r3e-toolbox\logs\`
- ✅ Set file rotation limit to 5MB
- ✅ Redirected console methods to electron-log in production
- ✅ Different levels for dev vs prod:
  - **Production**: console=info, file=info
  - **Development**: console=debug, file=info

### 3. **IPC Handlers (main.mjs)**

Added 5 IPC handlers for logging:

- `log:info` - Informational logs
- `log:error` - Error logs
- `log:warn` - Warning logs
- `log:debug` - Debug logs
- `log:getPath` - Get logs directory path

### 4. **Preload Bridge (preload.cjs)**

Exposed 5 methods to the renderer process:

- `logInfo(message, metadata)`
- `logError(message, metadata)`
- `logWarn(message, metadata)`
- `logDebug(message, metadata)`
- `getLogsPath()`

### 5. **Type Definitions (src/types/electron.ts)**

- ✅ Added types for all logging methods

### 6. **useLogger Hook (src/hooks/useLogger.ts)**

- ✅ Created a React hook for logging with web fallback (console)
- ✅ Supports automatic prefixing to identify the component
- ✅ Async and non-blocking
- ✅ Works in both Electron and web mode

### 7. **useElectronAPI Hook (updated)**

- ✅ Added methods `logInfo`, `logError`, `logWarn`, `logDebug`, `getLogsPath`

### 8. **Utility Helpers (src/utils/loggingUtils.ts)**

- ✅ Utility `openLogsFolder()` to open the logs folder in Windows Explorer
- ✅ Utility `getLogsPath()` to retrieve the path

### 9. **UI Component (src/components/LoggingSection.tsx)**

- ✅ Reusable component that shows:
  - logs folder path
  - "Load Path" button to fetch the path
  - "Open Logs Folder" button to open Windows Explorer
- ✅ Visible only in Electron mode

### 10. **Settings Page Integration (src/pages/Settings.tsx)**

- ✅ Integrated `LoggingSection` into the Settings page
- ✅ Positioned after the Game Data Management section

## Log File Location

```
C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\main.log
```

Example:

```
C:\Users\simon\AppData\Roaming\r3e-toolbox\logs\main.log
```

## How to Use the Logger

### In React/TypeScript Code

```typescript
import { useLogger } from "../hooks/useLogger";

export const MyComponent = () => {
  const logger = useLogger("MyComponent");

  const handleClick = async () => {
    logger.info("Button clicked");
    logger.info("User action", { userId: 123, action: "click" });

    try {
      // operation
    } catch (error) {
      logger.error("Operation failed", { error: error.message });
    }
  };

  return <button onClick={handleClick}>Click</button>;
};
```

### Log Levels

- **info**: General information
- **error**: Errors and issues
- **warn**: Warnings
- **debug**: Debug info (dev mode only)

### Optional Metadata

```typescript
logger.info("File loaded", {
  filename: "aiadaptation.xml",
  size: 1024,
  duration: 234, // ms
});
```

## Dev vs Production Differences

| Aspect            | Dev Mode               | Production                          |
| ----------------- | ---------------------- | ----------------------------------- |
| **Console Log**   | debug                  | info                                |
| **File Log Level**| info                   | info                                |
| **File Rotation** | 5MB                    | 5MB                                 |
| **Dev Tools**     | Automatically open     | Closed                              |
| **Path**          | Same                   | `AppData\Roaming\r3e-toolbox\logs\` |

## Settings Page - New Section

In the `/settings` page, a new **"Application Logs"** section appears (Electron only):

1. **Logs Location** - Text field showing the full path
2. **Load Path** - Button to fetch the path
3. **Open Logs Folder** - Button to open Windows Explorer (disabled until path is loaded)

## Configuration

The electron-log configuration in `main.mjs` is customizable:

```javascript
log.transports.file.maxSize = 5242880; // 5MB - adjust for rotation
log.transports.console.level = isDev ? "debug" : "info";
log.transports.file.level = "info";
```

## Logging Flow

```
React Component
  ↓
useLogger Hook
  ↓
IPC: ipcRenderer.invoke("log:*")
  ↓
Electron Main Process
  ↓
electron-log
  ↓
File System: AppData\Roaming\r3e-toolbox\logs\main.log
```

## Web Mode Fallback

When the app runs in **browser mode** (not Electron):

- ✅ `useLogger` still works
- ✅ Logs go to the browser console (DevTools → Console)
- ✅ No disk persistence (browser limitation)
- ✅ LoggingSection is not visible

## Testing

To test in development:

```bash
npm run dev  # Start Electron with Vite
```

Look for log lines in the Electron console output. Then:

1. Go to Settings → Application Logs
2. Click "Load Path"
3. Click "Open Logs Folder"
4. You should see the folder in Windows Explorer with `main.log`

For production mode, build with:

```bash
npm run build:electron
```

Then run the installer created in `dist/`.

## Files Modified/Created

### Modified:

- ✅ `package.json` - Added electron-log
- ✅ `electron/main.mjs` - Logging configuration and handlers
- ✅ `electron/preload.cjs` - Exposed logging methods
- ✅ `src/types/electron.ts` - Logging type definitions
- ✅ `src/hooks/useElectronAPI.ts` - Logging methods
- ✅ `src/pages/Settings.tsx` - LoggingSection integration
- ✅ `src/hooks/useLogger.ts` - Console methods fix

### Created:

- ✅ `src/hooks/useLogger.ts` - React hook for logging
- ✅ `src/components/LoggingSection.tsx` - Settings UI component
- ✅ `src/utils/loggingUtils.ts` - Utility helpers
- ✅ `LOGGING.md` - System documentation

## Troubleshooting

### Logs are not created

1. Verify the app is running in **production mode** (not `npm run dev`)
2. Check that `C:\Users\{username}\AppData\Roaming\r3e-toolbox\` is accessible
3. Verify write permissions

### The logs folder does not exist

- It will be created automatically on first log
- If it is not created, check permissions

### Log file is too large

- Adjust `maxSize` in `main.mjs` for more frequent rotation
- Old logs are archived automatically

## Implementation Notes

1. **IPC serialization**: electron-log and Zustand use `sanitizeForIPC()` to serialize complex objects
2. **Async**: All logs are asynchronous but do not block the UI
3. **Main + Renderer**: Both processes log to the same file
4. **No Dependencies**: electron-log has no external dependencies
5. **Performance**: Logging is fast and safe to use anywhere

## Compatibility

- Windows: ✅ Tested
- macOS: ✅ Should work (path is dynamic)
- Linux: ✅ Should work (path is dynamic)
- Web Browser: ✅ Console fallback

---

**Status**: ✅ **Implemented and Built**
**Build**: npm run build ✅ Successful
**Date**: March 4, 2026
