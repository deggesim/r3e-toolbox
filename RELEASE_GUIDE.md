# How to Distribute the App on GitHub

## Initial Setup (One-Time)

1. **Push the code to GitHub** if you haven't already:

   ```bash
   git remote add origin https://github.com/deggesim/r3e-toolbox.git
   git push -u origin main
   ```

2. **Verify GitHub Actions permissions**:
   - Go to: `https://github.com/deggesim/r3e-toolbox/settings/actions`
   - Make sure "Read and write permissions" is enabled for `GITHUB_TOKEN`

## Creating a Release

Every time you want to release a new version:

### 1. Update the version in package.json

```bash
# Option A: Manually
# Change "version": "0.0.0" to "version": "1.0.0" in package.json

# Option B: With npm
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### 2. Commit and create the tag

```bash
git add package.json
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 3. Wait for the automatic build

- GitHub Actions will automatically start the build
- You can follow the progress at: `https://github.com/deggesim/r3e-toolbox/actions`
- After 3-5 minutes, the release will appear at: `https://github.com/deggesim/r3e-toolbox/releases`

## Link to Add to README

Once you create the first release, update the README:

```markdown
**[⬇️ Download Latest Release (Windows Installer)](https://github.com/deggesim/r3e-toolbox/releases/latest)**
```

This link will always point to the latest available release!

## Manual Build (Optional)

If you want to test the installer locally before releasing:

```bash
npm run build:electron
```

Installers will be generated in `dist/`:

- **Windows**: `R3E Toolbox Setup X.X.X.exe` (NSIS installer) + portable version
- **macOS/Linux**: Use the web version published on Railway.app

## Automatically Generated Formats

With the current configuration, each release includes:

### Windows

- **NSIS Installer** (`.exe`): Standard installer with wizard
- **Portable** (`.exe`): Standalone version without installation

## Troubleshooting

### Build fails on GitHub Actions

- Check the logs at: `https://github.com/deggesim/r3e-toolbox/actions`
- Verify that all dependencies are in `package.json` (not in `devDependencies` if needed for runtime)

### Release not created

- Make sure you pushed the tag: `git push origin v1.0.0`
- The tag MUST start with `v` (e.g., `v1.0.0`, not `1.0.0`)

### Installer doesn't work

- Test locally first with `npm run build:electron`
- Verify that `icon.ico` exists in `public/`

### GitHub Token permissions

If you see permission errors, go to:
`Settings → Actions → General → Workflow permissions` and select "Read and write permissions"
