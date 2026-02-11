# Development Guide - R3E Toolbox

Practical guide to set up the development environment and contribute to the R3E Toolbox project.

## Initial Setup

### Prerequisites

- **Node.js 24.x** or higher
- **Git** for version control
- **pnpm** or **npm** (pnpm recommended for speed)

### Installation

```bash
# Clone repository
git clone https://github.com/deggesim/r3e-toolbox.git
cd r3e-toolbox

# Install dependencies
pnpm install
# or: npm install
```

## Starting Development

### Full Mode (Vite + Electron)

```bash
pnpm run dev
```

**What it does**:

- Starts Vite server on `http://localhost:5173`
- Starts Electron instance that loads the server
- Automatic hot reload on file changes
- DevTools available with F12

### Web Only Mode (Browser)

```bash
pnpm run dev:vite
```

Useful for:

- Quick testing in browser
- UI development without Electron
- Lighter debugging

Manually open `http://localhost:5173` in your browser.

### Electron Only Mode

```bash
pnpm run dev:electron
```

Requires Vite to already be running in another terminal. Useful for:

- Testing file dialogs
- Debugging IPC messages
- Testing desktop functionality

## Project Structure Post-Update

### Component Organization (v0.4.3)

```
src/
├── pages/
│   ├── AIManagement.tsx              ✅ Full feature
│   ├── FixQualyTimes.tsx             ✅ Full feature
│   ├── BuildResultsDatabase.tsx      ✅ Full feature
│   ├── ResultsDatabaseViewer.tsx     ✅ Browse saved championships
│   ├── ResultsDatabaseDetail.tsx     ✅ Championship details
│   ├── GameDataOnboarding.tsx        ✅ Setup r3e-data.json
│   └── Settings.tsx                  ✅ Config and UI settings
│
├── components/
│   ├── Layout.tsx                    ← Sidebar nav (NEW)
│   ├── AIManagementGUI.tsx           ← AI dashboard
│   ├── FileUploadSection.tsx         ← Shared file upload
│   ├── ProcessingLog.tsx             ← Timestamp logs
│   └── ...other components
```

### New Integrations (February 2026)

- ✨ **Font Awesome Icons**: `@fortawesome/react-fontawesome` v7.1
  - Solid SVG icons throughout the UI
  - Used in ProcessingLog, sidebar menu, badges

- 📱 **Responsive Design**: Mobile-first Bootstrap
  - Sidebar auto-collapses
  - Flexbox-based layout for small screens
  - Touch-friendly button sizing

- 💾 **Asset Caching**: Zustand + localStorage
  - Leaderboard icons cached in localStorage
  - Cache status indicator badge
  - "Clear cache" button for manual reset

## Contribution Workflow

### 1. Create a Branch

```bash
git checkout -b fix/bug-name
# or
git checkout -b feat/feature-name
```

### 2. Follow Conventional Commits

Commit message format for semantic-release:

```bash
# Feature (generates MINOR version)
git commit -m "feat: added support for multi-class championships"

# Fix (generates PATCH version)
git commit -m "fix: corrected points calculation with lap completion bonus"

# Breaking Change (generates MAJOR version)
git commit -m "feat!: removed support for legacy XML format

BREAKING CHANGE: Previous format is no longer supported"
```

**Conventions**:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting (no functional change)
- `refactor:` - Code restructure
- `perf:` - Performance improvement
- `test:` - Test changes
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Maintenance

See [CONTRIBUTING.md](CONTRIBUTING.md) for complete details.

### 3. Test Locally

```bash
# Type check
pnpm run tsc --noEmit

# Linting
pnpm run lint

# Local build
pnpm run build

# Build Electron (generates installer)
pnpm run build:electron
```

### 4. Push and PR

```bash
git push origin fix/bug-name
```

Then create a Pull Request on GitHub with:

- Clear description of changes
- Link to relevant issue (if exists)
- Testing checklist

## Debugging

### Browser DevTools (Electron)

Press **F12** during development to open:

- Console (JS output and errors)
- Elements (HTML/CSS inspector)
- Network (Vite hot reload)
- Application (localStorage, cookies)

### Debug localStorage

```bash
# In browser console:
// View all store keys
Object.keys(localStorage)

// Read assets cache
JSON.parse(localStorage['r3e-toolbox-leaderboard-assets'])

// Read config store
JSON.parse(localStorage['r3e-toolbox-config'])

// Clear everything
localStorage.clear()
```

### Debug Zustand State

In code:

```typescript
// Subscribe to state changes (auto-log)
useConfigStore.subscribe((state, prev) => {
  console.log("Config changed:", { prev, state });
});

// View snapshot
console.log(useConfigStore.getState());
```

### Debug Electron IPC

In `electron/main.mjs`:

```typescript
// Log incoming IPC calls
ipcMain.handle("fs:readFile", (event, filePath) => {
  console.log("[IPC] fs:readFile:", filePath);
  // ...
});
```

## Development Patterns

### Adding a New Main Feature

1. **Create page**: `src/pages/MyFeature.tsx`
2. **Add routing**: Modify `src/App.tsx`
3. **Add menu**: Update `src/components/Layout.tsx`
4. **Create store** (if needed): `src/store/myStore.ts`
5. **End-to-end test**: web + Electron
6. **Commit**: `feat: add MyFeature page`

### Adding a New Utility

1. **Create file**: `src/utils/myUtil.ts`
2. **Export named functions**: NO default export
3. **Type safety**: Define types explicitly
4. **Document**: JSDoc comments for public functions
5. **Test**: Verify with real R3E data

### Adding a Zustand Store

**Pattern**:

```typescript
// src/store/myStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface MyState {
  data: string;
  setData: (data: string) => void;
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      data: "",
      setData: (data) => set({ data }),
    }),
    { name: "my-store-key", storage: createJSONStorage(() => localStorage) },
  ),
);
```

Usage in React components:

```typescript
const data = useMyStore((state) => state.data);
const setData = useMyStore((state) => state.setData);
```

## Performance Tips

- ✅ Use `useMemo` for complex props
- ✅ Use `useCallback` for event handlers
- ✅ Lazy-load route components: `React.lazy()`
- ✅ Cache big assets in localStorage (Zustand persist)
- ✅ Profile with Chrome DevTools → Performance tab
- ❌ Avoid re-renders: memoize Zustand selectors

## Troubleshooting

### Issue: "EADDRINUSE" error (port 5173 occupied)

```bash
# Kill process on port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9
```

### Issue: Electron window stays blank

1. Verify Vite is running: `http://localhost:5173`
2. Check Electron console (F12)
3. Verify asset paths in `electron/main.mjs`
4. Restart with `npm run dev`

### Issue: File upload doesn't work in browser

- File API is limited in browser: drag-drop + click dialogs only
- Electron mode has native file dialogs
- Check `useElectronAPI()` in component

### Issue: localStorage is too full

```typescript
// In Settings.tsx or developer console:
useLeaderboardAssetsStore().clearAssets();
localStorage.clear();
```

## Useful Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React 19 Docs](https://react.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Configuration](https://vitejs.dev/config/)
- [Electron IPC Docs](https://www.electronjs.org/docs/latest/api/ipc-main)
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
- [mathjs Matrix Algebra](https://mathjs.org/)

## Contact & Support

- **Bug report**: GitHub Issues
- **Feature request**: GitHub Discussions
- **Security**: See SECURITY.md (if exists)

---

**Last Updated**: February 11, 2026 (v0.4.3)
