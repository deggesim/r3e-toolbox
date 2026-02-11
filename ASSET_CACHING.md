## Leaderboard Assets Caching System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BuildResultsDatabase Component                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ useEffect Hook   │
                    │ (Load cached)    │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌─────────────────────┐    ┌──────────────────────┐
    │ cachedAssets from   │    │ fetchLeaderboard     │
    │ Zustand Store       │    │ AssetsWithCache()    │
    │ (localStorage)      │    │ (on button click)    │
    └─────────────────────┘    └──────────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────┐
                        │ Check Zustand Store       │
                        │ for cached assets         │
                        └───────────────────────────┘
                                        │
                        ┌───────────────┴────────────┐
                        ▼                            ▼
            ┌──────────────────────┐    ┌──────────────────────┐
            │ Cache HIT:           │    │ Cache MISS:          │
            │ Return from store    │    │ Fetch from leaderboard
            │ (instant)            │    │ (network request)    │
            └──────────────────────┘    └──────────────────────┘
                        │                            │
                        └────────────┬───────────────┘
                                     ▼
                    ┌────────────────────────────┐
                    │ Update Zustand Store       │
                    │ + localStorage             │
                    │ (via persist middleware)   │
                    └────────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────┐
                    │ Render Assets in UI        │
                    │ Show cache badge status    │
                    │ (💾 Cached indicator)      │
                    └────────────────────────────┘
```

### Data Flow

1. **Component Mount** → `useEffect` loads cached assets from Zustand store
2. **User clicks "Download and analyze"** → calls `fetchLeaderboardAssetsWithCache()`
3. **Cache Check** → Zustand store queries localStorage:
   - **Hit**: Returns `state.assets` immediately
   - **Miss**: Calls `fetchLeaderboardAssets()` → network request
4. **Data Storage** → `setAssets()` persists to store (auto-saves to localStorage)
5. **UI Feedback** → Shows badge indicating cache source and updates icon count

### Zustand Store Methods

```typescript
// Get cached assets
const assets = useLeaderboardAssetsStore((state) => state.assets);

// Update assets
useLeaderboardAssetsStore().setAssets(assets);

// Check loading state
const isLoading = useLeaderboardAssetsStore((state) => state.isLoading);

// Get specific icon URLs
const classIconUrl =
  useLeaderboardAssetsStore().getClassIconUrl("porsche911gt2rs");
const trackIconUrl = useLeaderboardAssetsStore().getTrackIconUrl("donington");

// Clear all cached data
useLeaderboardAssetsStore().clearAssets();
```

### localStorage Format

```json
{
  "r3e-toolbox-leaderboard-assets": {
    "state": {
      "assets": {
        "sourceUrl": "https://game.raceroom.com/leaderboard",
        "fetchedAt": "2026-01-23T14:30:45.123Z",
        "classes": [
          {
            "id": "porsche911gt2rs",
            "name": "Porsche 911 GT2 RS",
            "iconUrl": "https://..."
          },
          {
            "id": "mclaren720s",
            "name": "McLaren 720S",
            "iconUrl": "https://..."
          }
        ],
        "tracks": [
          {
            "id": "donington",
            "name": "Donington Park",
            "iconUrl": "https://..."
          },
          {
            "id": "silverstone",
            "name": "Silverstone",
            "iconUrl": "https://..."
          }
        ]
      },
      "isLoading": false,
      "error": null
    },
    "version": 1
  }
}
```

### Benefits

✅ **No redundant network requests** - Assets fetched once, reused across sessions  
✅ **Instant load times** - Cached data loads from localStorage without latency  
✅ **User control** - "Clear cache" button allows manual refresh  
✅ **Automatic persistence** - Zustand persist middleware handles storage automatically  
✅ **Error handling** - Store tracks loading/error states for UI feedback  
✅ **Type-safe** - Full TypeScript validation of cached data structure

### Clear Cache Workflow

When user clicks "Clear cache" button:

```typescript
clearAssets()  // Calls Zustand action
  ↓
state.assets = null
state.error = null
state.isLoading = false
  ↓
localStorage updated (automatic via persist middleware)
  ↓
UI resets to "No assets loaded" state
```

Next data fetch will force a fresh network request from the leaderboard.

---

**Ultimo aggiornamento**: 11 Febbraio 2026 | **Versione**: 0.4.3
