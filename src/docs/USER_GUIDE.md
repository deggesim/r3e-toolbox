# R3E Toolbox - User Guide

Welcome to R3E Toolbox! This guide will help you use the five main features of the application.

## Overview

R3E Toolbox is a comprehensive toolkit for **RaceRoom Racing Experience** (R3E). It provides tools for managing AI difficulty, correcting race results, building championship standings, and reviewing saved championships.

### Main Features

1. **AI Management** - Optimize AI difficulty settings through statistical analysis
2. **Fix Qualy Times** - Recover missing qualification times in race result files
3. **Build Results Database** - Generate visual championship standings from race results
4. **Results Database Viewer** - Browse and export saved championships
5. **Settings** - Configure fitting parameters and UI defaults

---

## 0. Game Data Management

Before using any feature, you need to load the RaceRoom game database (`r3e-data.json`).

### First Launch

**Electron Desktop App** (recommended):

- The app automatically searches for `r3e-data.json` in standard RaceRoom installation paths
- If found, it's loaded automatically with validation
- If not found, you'll see the onboarding screen to upload manually

**Web Browser**:

- Manual upload required on first launch
- Use the file picker to select your `r3e-data.json` file

### Reloading Game Data

You may need to reload the game database when:

- RaceRoom adds new content (tracks, cars, layouts)
- You update to a newer database version
- You want to switch between different game installations

**How to reload**:

1. Open **Settings** from the left menu
2. Enable **"Show Game Data Onboarding"** (development mode only)
   - Or navigate directly to the URL: `/game-data-onboarding`
3. Choose reload method:
   - **Electron mode**: Click to re-trigger auto-detection from game installation
   - **Web/Electron**: Use "Upload File" to select a new `r3e-data.json` file
4. Wait for validation to complete
5. Check the processing log for:
   - ✓ Number of classes and tracks loaded
   - ⚠ Any validation warnings
   - ✗ Errors if file structure is invalid

### Data Storage

- **Electron App**: Game data stored in `electron-store` (persistent native storage)
  - Location (Windows): `%APPDATA%\r3e-toolbox\config.json`
  - Survives app restarts and updates
  - No size limitations
- **Web Browser**: Game data stored in browser `localStorage`
  - Cleared when browser data is cleared
  - 5-10MB size limit

### Validation

All loaded files are automatically validated:

- Checks for required fields: `classes`, `tracks`, `layouts`
- Validates data structure and IDs
- Shows detailed errors if validation fails
- Logs non-critical warnings (e.g., name/ID mismatches)

---

## 1. AI Management

Optimize AI difficulty settings by analyzing your race data with statistical fitting.

> **Note**: The AI fitting algorithms are based on the [r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer) project by pixeljetstream.

### How It Works

1. **Import XML**: Upload your `aiadaptation.xml` file from RaceRoom UserData
2. **Select Track/Class**: Choose which track and vehicle class to analyze
3. **View AI Levels**: See sampled and predicted lap times for each difficulty level
4. **Manage Player Times**: Remove outliers or poor performances that might skew the AI fitting
5. **Fit Data**: The app uses linear regression to predict unmeasured AI lap times
6. **Validate**: Only monotonic (decreasing) predictions are accepted
7. **Export**: Download the updated configuration file with new AI data

### Removing Player Times

Your personal best lap times are used to predict AI difficulty levels. If you have inconsistent or outlier times that don't reflect your true pace, you should remove them before fitting:

- **View All Times**: "Player Times" panel shows all your recorded lap times for the selected track/class
- **Remove Individual Time**: Click the trash icon next to any time to delete it
- **Keep Best Only**: Click "Delete All But Min" to keep only your best lap time and remove all others
- **Restore Original**: Use "Restore" button in "Modifications" panel to revert all removals

**Why Remove Times?**

- Bad races or off-track moments create outlier times
- Inconsistent data confuses the AI fitting algorithm
- Keeping only your best representative times improves AI level predictions

### Key Concepts

- **Sampled AI Levels**: Difficulty levels where you've tested lap times (shows real data)
- **Predicted Levels**: Difficulty levels without test data (calculated from samples)
- **Fitting Tolerance**: Adjustable threshold for how much predicted times can deviate
- **Validation**: Rejects fits that don't follow logic (faster times at harder difficulties)

### Tips

- Test AI at multiple difficulty levels (e.g., 80, 90, 100, 110, 120) for better predictions
- Remove any outlier player times before fitting to improve accuracy
- Use "Reset to defaults" in Settings if fitting produces unexpected results
- Check the processing log for validation details and error messages

---

## 2. Fix Qualy Times

RaceRoom sometimes saves race results with missing qualification times. This tool recovers them.

### When to Use

You have a race session file where drivers' qualification times are missing or show `-1` (invalid).

### How It Works

1. **Upload Qualification File**: Select the qualification session file (`.txt`)
2. **Upload Race File**: Select the corresponding race session file (`.txt`)
3. **Validate**: The tool checks that both files are from the same event
4. **Extract Times**: Best qualification lap times are extracted for each driver
5. **Patch Race File**: Qualification times are inserted into the race result
6. **Download**: A fixed file with `_fix.txt` suffix is generated

### What Gets Fixed

- Drivers missing from the race qualification file are flagged as warnings
- Invalid qualification times (`-1`) are replaced with the real time from the qualification session
- All lap time data is validated before applying changes
- The original file remains unchanged; a new file is created

### File Format

- Supports RaceRoom's standard race result format (`.txt` files)
- Also supports JSON export format from race sessions

---

## 3. Build Results Database

Generate professional championship standings with car and track icons from official RaceRoom leaderboard.

> **Note**: Championship standings logic is inspired by the [r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship) project by pixeljetstream.

### How It Works

#### Step 1: Download Assets

- Click **"Download and analyze"** to fetch official assets (car icons, track images)
- Icons are cached in persistent storage for faster future use
- Shows "💾 Cached" indicator when data is already available
- Use "Clear cache" to force a fresh download

#### Step 2: Select Results Folder

- Choose a folder containing race result files (`.txt`)
- All races in that folder are automatically analyzed
- Shows count of successfully parsed races
- Warnings appear for unrecognized tracks or vehicle classes
- **Important**: If you select a championship alias that already exists, the new races will be **added to the existing championship** (merged, not replaced)

#### Step 3: Enter Championship Name

- Give your championship a memorable alias (e.g., "DTM 2026 Season")
- This name will appear in Results Database Viewer

#### Step 4: Preview & Export

- View live preview of the championship standings
- See driver statistics: races, wins, podiums, total points
- Race-by-race results with track icons
- Click **"Export HTML"** to download a standalone championship file

### Understanding the Standings

- **Points System**: Standard motorsport points (25, 18, 15, 12, 10, 8, 6, 4, 2, 1)
- **Races**: Total number of races competed
- **Wins**: Number of race victories
- **Podiums**: Number of top-3 finishes
- **Points**: Total championship points

### Tips

- All race files must be from the same game/season for accurate standings
- Icons are cached—use "Clear cache" if you see missing images
- Export creates a self-contained HTML file—no internet needed to view it

---

## 4. Results Database Viewer

Browse, search, and manage all championships you've created.

### How It Works

1. **View All Championships**: See a list of all saved championships
2. **Search & Filter**: Find championships by name, driver, or team
3. **View Details**: Click a championship to see full standings and statistics
4. **Export Options**:
   - Export single championship HTML
   - Export full championship index
   - Download the raw database as JSON

### Championship Details Page

Shows three standings tables:

- **Driver Standings**: Individual driver statistics and points
- **Team Standings**: Aggregate team performance
- **Vehicle Standings**: Performance by car class

### Managing Championships

- All championships are stored locally
- Use "Clear cache" in Settings to remove stored data
- Each championship can be re-exported or deleted individually

---

## 5. Settings

Configure how the app behaves and tune statistical fitting parameters.

### Fitting Parameters

- **Min/Max AI Difficulty**: Range of AI levels to fit (default: 80-120)
- **Fit Mode**: Use averaged times or individual lap samples
- **Validation Tolerance**: How much predicted times can deviate from sampled data
- **Reset to Defaults**: One-click restore to built-in configuration

### Adjustment Tips

- Increase tolerance if validation is too strict
- Use individual samples for more precise fitting
- Reset to defaults if uncertain about changes

### Cache Management

- **Clear All Assets**: Removes cached car/track icons from localStorage/electron-store
- Useful if images aren't displaying correctly
- Assets will be re-downloaded on next use

### Game Data Management

- **Show Game Data Onboarding**: Enables access to the game data reload screen
- Use this when you need to update or reload `r3e-data.json`
- Available in development mode or via direct URL navigation

---

## System Requirements

### Recommended

- **R3E Toolbox Desktop App** - Windows only
  - Download from [GitHub Releases](https://github.com/deggesim/r3e-toolbox/releases)
  - Native file dialogs and auto-detection of game files
  - Best performance and user experience

### Alternative

- Modern web browser (Chrome, Edge, Firefox)
  - Works on Windows, macOS, or Linux
  - Manual file selection required
  - Available at [r3e-toolbox web version](https://github.com/deggesim/r3e-toolbox)

## File Locations (Windows)

### RaceRoom Game Data

- **AI Configuration**:

  ```
  %USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Player1\aiadaptation.xml
  ```

- **Race Results**:

  ```
  %USERPROFILE%\Documents\My Games\SimBin\RaceRoom Racing Experience\UserData\Log\Results\*.txt
  ```

- **Game Database** (`r3e-data.json`):
  - Extracted from game API
  - Upload via Game Data setup screen on first launch

## Troubleshooting

### Missing qualification times after fixing

- Verify both files are from the same event
- Check that qualification file contains all drivers
- Re-export the race file and try again

### Icons not appearing in championship

- Click "Clear cache" in Build Results Database
- Try "Download and analyze" again
- If CORS error persists, use manual HTML paste option

### AI fitting rejected as invalid

- Check that lap times decrease with higher difficulty levels
- Test AI at more difficulty levels for better curve fitting
- Review validation tolerances in Settings

### File not found errors

- Ensure file paths are correct and files exist
- Check file permissions and accessibility
- In Electron mode, verify game installation location

## Tips & Best Practices

1. **Keep backups**: Save a backup of your original `aiadaptation.xml` before fitting
2. **Test incrementally**: Don't change all AI levels at once—test a few first
3. **Use consistent data**: AI samples from similar race conditions produce better fits
4. **Cache management**: Clear cache if you see missing images or stale data
5. **File naming**: Use descriptive championship names for easy identification

## Getting Started

1. Launch the app
2. Upload your `r3e-data.json` game database (one-time setup)
3. Choose a feature from the left menu
4. Follow the on-screen prompts and processing logs

## Support

For issues, feature requests, or bug reports, visit the [GitHub repository](https://github.com/deggesim/r3e-toolbox).

---

**Version**: 0.4.5  
**Last Updated**: February 2026
