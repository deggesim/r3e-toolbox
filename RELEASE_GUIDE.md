# How to Distribute the App on GitHub

## Initial Setup (One-Time)

1. **Push the code to GitHub** if you haven't already:

   ```bash
   git remote add origin https://github.com/deggesim/r3e-toolbox.git
   git push -u origin master
   ```

2. **Verify GitHub Actions permissions**:
   - Go to: `https://github.com/deggesim/r3e-toolbox/settings/actions`
   - Make sure "Read and write permissions" is enabled for `GITHUB_TOKEN`

## Creating a Release

Every time you want to release a new version, semantic-release handles versioning, tags, and release creation automatically.

Before publishing, run the QA agent suite:

```bash
npm run agent:workflow:pre-release --releaseVersion="x.y.z"
```

### 1. Merge or push conventional commits to master

Ensure commits follow Conventional Commits (see CONTRIBUTING.md). Then push to `master`.

### 2. Wait for the automatic release

- GitHub Actions will automatically start the build
- You can follow the progress at: `https://github.com/deggesim/r3e-toolbox/actions`
- After 3-5 minutes, the release will appear at: `https://github.com/deggesim/r3e-toolbox/releases`

### 3. Optional: dry-run locally

```bash
npx semantic-release --dry-run
```

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
- **macOS/Linux**: Use the web version at [https://r3e-toolbox.up.railway.app](https://r3e-toolbox.up.railway.app)

## Automatically Generated Formats

With the current configuration, each release includes:

### Windows

- **NSIS Installer** (`.exe`): Standard installer with wizard
- **Portable** (`.exe`): Standalone version without installation
- **Update metadata** (`latest.yml` + `.blockmap`): Required for auto-update

## Troubleshooting

### Build fails on GitHub Actions

- Check the logs at: `https://github.com/deggesim/r3e-toolbox/actions`
- Verify that all dependencies are in `package.json` (not in `devDependencies` if needed for runtime)

### Release not created

- Make sure the commit is on `master`
- Verify the commit message follows Conventional Commits
- Check the semantic-release job logs in GitHub Actions

### Auto-update metadata missing

- Ensure the release assets include `latest.yml` and `.blockmap` files from `dist/`
- The GitHub Actions upload step should include both metadata files

### Installer doesn't work

- Test locally first with `npm run build:electron`
- Verify that `icon.ico` exists in `public/`

### GitHub Token permissions

If you see permission errors, go to:
`Settings → Actions → General → Workflow permissions` and select "Read and write permissions"
