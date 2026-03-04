# Logging System

## Overview

The logging system automatically persists application logs when running in production mode.

### Operating Modes

#### Electron (Desktop)

- **Production**: Logs saved to `C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\main.log`
- **Development**: Logs printed to the console with `debug` priority (file uses `info` level)
- **Limit**: 5MB max per file (automatic rotation)

#### Web (Browser)

- **Fallback**: Browser console
- **No persistence**: Logs are not written to disk

## How to Use the Logger

### In React Code

```typescript
import { useLogger } from "../hooks/useLogger";

export const MyComponent = () => {
  const logger = useLogger("MyComponent");

  const handleClick = async () => {
    logger.info("Button clicked", { userId: 123 });
    try {
      // ... operation
    } catch (error) {
      logger.error("Operation failed", { error: error.message });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
};
```

### Log Levels

- **info**: General information
- **error**: Errors
- **warn**: Warnings
- **debug**: Debug info (dev mode only)

### Metadata

You can pass optional metadata as the second parameter:

```typescript
logger.info("User logged in", { username: "john", timestamp: Date.now() });
logger.error("API request failed", { status: 500, endpoint: "/api/data" });
```

## Accessing Logs

### Via IPC (Electron)

```typescript
import { useElectronAPI } from "../hooks/useElectronAPI";

const MyComponent = () => {
  const { getLogsPath, openExternal } = useElectronAPI();

  const openLogFolder = async () => {
    const path = await getLogsPath();
    console.log("Logs are stored in:", path);
    // Open the folder in Windows Explorer
    await openExternal(`file:///${path.replace(/\\/g, "/")}`);
  };

  return <button onClick={openLogFolder}>Open Logs Folder</button>;
};
```

## Log File Format

```
[2026-03-04 14:23:45.123] [INFO]  [MyComponent] Button clicked {"userId": 123}
[2026-03-04 14:23:46.456] [ERROR] [MyComponent] Operation failed {"error": "Network timeout"}
```

## Log Cleanup

Logs are automatically rotated when they exceed 5MB. You can configure this size in `main.mjs`:

```javascript
log.transports.file.maxSize = 5242880; // 5MB
```

## Production Monitoring

In production mode:

1. **All `console.*` calls are redirected to electron-log**
2. **Logs are not printed to the console** (file only)
3. **Main and renderer processes share the same log file**

### Level Control in Production vs Dev

| Environment | Console | File |
| ----------- | ------- | ---- |
| Production  | info    | info |
| Development | debug   | info |

## Troubleshooting

### Logs are not created

- Make sure the app is running in **production mode** (not `npm run dev`)
- Check that `C:\Users\{username}\AppData\Roaming\r3e-toolbox\logs\` is accessible
- Verify write permissions for the AppData folder

### The logs folder does not exist

- It is created automatically on first launch
- If it is not created, check permissions under AppData\Roaming

### How to rebuild the app

```bash
npm run build:electron
```
