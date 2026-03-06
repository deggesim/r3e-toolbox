# Auto-Update System for R3E Toolbox

## Overview

The auto-update system uses **electron-updater** to automatically check for new releases on GitHub and notify the user.

## Features

✅ **Automatic check**: Verifies new releases at startup and every hour  
✅ **Custom notifications**: Native Windows dialogs with download options  
✅ **Background download**: Does not block the interface during download  
✅ **Automatic installation**: New version is installed on restart  
✅ **Progress monitoring**: Visual notification with download progress bar  
✅ **Manual check**: Help menu → "Check for Updates"

## How It Works

### 1. Configuration

In `package.json`, GitHub publish is configured:

```json
"publish": {
  "provider": "github",
  "owner": "deggesim",
  "repo": "r3e-toolbox"
}
```

### 2. Update Flow

```
[Startup] → Check for Updates (after 5 sec)
           ↓
       Update Available → Show Dialog
           ↓
       User clicks "Download Now"
           ↓
       Download Progress (notification in bottom-right)
           ↓
       Download Complete → Show Install Dialog
           ↓
       User clicks "Install Now" → Restart app and install
```

### 3. Affected Files

- **`electron/updater.mjs`** - Main update logic
  - `initAutoUpdater()` - Initializes automatic check
  - `manualCheckForUpdates()` - Manual trigger from menu
  - Event handlers for download/installation

- **`electron/main.mjs`** - Updater integration
  - Imports and initializes updater on app start
  - Adds "Check for Updates" to Help menu

- **`src/hooks/useAutoUpdater.ts`** - React hook
  - Listens to download progress
  - Provides data for UI component

- **`src/components/UpdateProgressNotification.tsx`** - UI
  - Shows download progress bar in bottom-right corner
  - Displays percentage and size

## Behavior in Development Mode

The system is **automatically disabled** in development:

```typescript
if (isDev) {
  console.log("[Updater] Running in development mode, auto-updater disabled");
}
```

## Deployment Setup

Releases are published automatically by semantic-release when changes are pushed to `master`.

1. **Push conventional commits to master**
2. **GitHub Actions runs semantic-release**

- Tags and GitHub Releases are created automatically

3. **build-electron uploads assets** for auto-updates

### Release assets must include

- `latest.yml`
- `*.blockmap`
- `*.exe` installers

## Important Notes

⚠️ **Asset Size**: electron-updater will do delta updates (only differences). First download is ~200MB.

## Testing in Development

You cannot test the auto-updater in dev mode, but you can:

1. Build for production: `npm run build:electron`
2. Launch the built app from `dist/`
3. For full update flow, push to `master` and let CI publish a release

Alternatively, mock in tests, but this is not recommended for critical functionality.

## Temporarily Disable

If you need to disable the check (for offline testing):

```javascript
// In electron/main.mjs
// initAutoUpdater(mainWindow);  // Comment this line
```

## Future Improvements

- [ ] Configure Windows binary signing (Code Signing)
- [ ] Add visible changelog in dialog
- [ ] Support for staging/beta releases
- [ ] Notification when update is ready for next restart
