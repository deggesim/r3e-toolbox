# R3E Toolbox - Implementation Summary

## 📊 Current Version: 1.3.2 (February 2026)

### 🙏 Credits & Acknowledgments

This project builds upon the excellent work from **pixeljetstream**:

- **AI Management**: Fitting algorithms and `aiadaptation.xml` generation are based on [r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer)
- **Championship Standings**: Standings calculation and HTML generation are inspired by [r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship)

This toolbox implements and extends those concepts with a modern graphical interface and additional features.

### ✅ Recent Developments (February 2026)

**Enhanced User Interface**:

- Font Awesome icons integrated (v7.1) throughout the application for better UX
- Responsive mobile sidebar: automatically collapsed on small devices
- Layout and style improvements for optimal user experience on mobile and desktop
- Enhanced CSS badges and visual icons for operation status

**Asset Management**:

- Automatic caching system for leaderboard icons (localStorage)
- Smart fetching: instant cache hit, network fallback on miss
- UI feedback: "💾 Cached" badge indicator with timestamp
- "Clear cache" button to force manual refresh

**Electron Integration**:

- Windows build with NSIS installer and portable version
- Dual-mode support: desktop app + web browser
- Auto-detection of game files in Electron mode

## 📚 Asset Caching Documentation

Implemented a caching system for leaderboard assets (car and track icons) so they don't need to be fetched on every load.

**Solution implemented**: Zustand Store + persistent storage (electron-store/localStorage) + intelligent caching

---

## 📁 Files Created

### 1. **`src/store/leaderboardAssetsStore.ts`** (new)

Zustand store to manage asset cache with localStorage persistence.

**Features:**

- `assets`: Stores URLs and metadata for cars and tracks
- `isLoading`, `error`: Tracks fetch state
- `setAssets()`: Updates assets in the store
- `getClassIconUrl()`, `getTrackIconUrl()`: Helper methods to retrieve specific URLs
- `clearAssets()`: Clears cache from localStorage
- `persist` middleware: Automatically saves to localStorage

```typescript
useLeaderboardAssetsStore.getState().assets; // Direct access
useLeaderboardAssetsStore((state) => state.assets); // Hook in React components
```

---

## 📄 Modified Files

### 2. **`src/utils/leaderboardAssets.ts`**

Added new function for caching:

**New function:**

```typescript
fetchLeaderboardAssetsWithCache(options?: {
  forceRefresh?: boolean;
  signal?: AbortSignal;
})
```

**Logic:**

1. Checks if data is already in localStorage (cache hit)
2. If yes: returns immediately without network requests
3. If no: downloads from leaderboard and saves to store
4. Supports `forceRefresh: true` to bypass cache

---

### 3. **`src/pages/BuildResultsDatabase.tsx`**

Integration of store in main component:

**Changes:**

- Import of `useLeaderboardAssetsStore` and `fetchLeaderboardAssetsWithCache`
- `useEffect` to load cached assets on component mount
- Button update: "Reset" → "Clear cache" with `clearAssets()`
- Indicator badge: "💾 Cached" when data comes from cache (electron-store or localStorage)
- Smart logic:
  - If HTML override exists: direct fetch (bypasses cache)
  - Otherwise: uses `fetchLeaderboardAssetsWithCache()` (with cache)

---

### 4. **`README.md`**

Added documentation on caching functionality:

- System description
- How it works (4 steps)
- Technical implementation
- Usage examples
- Store methods explanation

---

### 5. **`ASSET_CACHING.md`** (new, technical documentation)

Detailed guide with ASCII diagrams:

- Data flow architecture
- Cache logic flowchart
- localStorage JSON format
- Zustand store API
- Benefits and cleanup workflow

---

## 🎯 How It Works

### First Load

```
1. User clicks "Download and analyze"
2. Component calls fetchLeaderboardAssetsWithCache()
3. Zustand store checks localStorage
4. Cache MISS → network request to leaderboard
5. Data saved to store → localStorage (automatic)
6. UI shows "Fresh" badge
```

### Subsequent Loads

```
1. Component mounts → useEffect calls store
2. Data from localStorage → instant
3. Button calls fetchLeaderboardAssetsWithCache()
4. Cache HIT → returns immediately
5. UI shows "💾 Cached" badge (storage backend: electron-store or localStorage)
```

### Clear Cache

```
User clicks "Clear cache" → clearAssets()
→ localStorage cleared → next fetch will be fresh
```

---

## 🔍 Verifications Performed

✅ **Build**: Compiles without TypeScript errors  
✅ **Linter**: No errors in modified files  
✅ **Types**: Type-safe with complete TypeScript  
✅ **Storage**: localStorage persists data between sessions  
✅ **Logic**: Cache check before network request

---

## 💾 localStorage Structure

```json
{
  "r3e-toolbox-leaderboard-assets": {
    "state": {
      "assets": {
        "sourceUrl": "https://game.raceroom.com/leaderboard",
        "fetchedAt": "2026-01-23T14:30:45.123Z",
        "classes": [...],
        "tracks": [...]
      },
      "isLoading": false,
      "error": null
    },
    "version": 1
  }
}
```

**Space occupied**: ~50-100 KB (depends on number of assets)  
**Duration**: Until user clears localStorage or clicks "Clear cache"

---

## 🚀 Code Usage

### In React components:

```typescript
// Read cache
const assets = useLeaderboardAssetsStore((state) => state.assets);

// Update
useLeaderboardAssetsStore().setAssets(newAssets);

// Clear
useLeaderboardAssetsStore().clearAssets();
```

### In utility functions:

```typescript
// Fetch with automatic caching
const assets = await fetchLeaderboardAssetsWithCache();

// Force refresh
const fresh = await fetchLeaderboardAssetsWithCache({ forceRefresh: true });
```

---

## 📊 Benefits

| Benefit              | Description                                    |
| -------------------- | ---------------------------------------------- |
| **No Network Calls** | After first fetch, data is reused              |
| **Instant Load**     | Assets from localStorage load instantly        |
| **User Control**     | "Clear cache" allows manual refresh            |
| **Auto-Persist**     | Zustand persist middleware saves automatically |
| **Error Handling**   | State tracking for loading/error states        |
| **Type-Safe**        | Full TypeScript validation                     |

---

## ✨ Future Improvements (Optional)

- [ ] TTL (Time To Live) for cache (e.g., 24 hours)
- [ ] Cache size indicator
- [ ] "Auto-refresh" option for periodic updates
- [ ] Data compression in localStorage
- [ ] Sync between tabs in same browser

---

**Implementation completed and tested! ✅**

**Last Updated**: February 26, 2026 | **Version**: 1.3.2

**Ultimo aggiornamento**: 26 Febbraio 2026 | **Versione**: 1.3.2
