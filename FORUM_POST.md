# R3E Toolbox - Comprehensive Race Management Suite for RaceRoom

Hello RaceRoom community! 👋

I'm excited to share a project I've been working on: **R3E Toolbox** - a complete suite of tools designed to enhance your RaceRoom Racing Experience.

## What is R3E Toolbox?

R3E Toolbox is a free, open-source desktop application (also available as a web app) that brings together multiple utilities to help you manage AI difficulty, fix race results, and create professional championship standings.

**[⬇️ Download the latest version here](https://github.com/deggesim/r3e-toolbox/releases/latest)** (Windows installer + portable version)

Or try the **[web version](https://r3e-toolbox.up.railway.app)** (works on any platform: Windows, macOS, Linux)

## Key Features

### 1. **AI Management** 🤖

Based on the excellent work from [@pixeljetstream's r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer), this tool helps you:

- Analyze your `aiadaptation.xml` file
- Use linear regression to predict lap times for unmeasured AI difficulty levels
- Validate fit quality and detect outliers
- Generate optimized AI settings for all your track/class combinations
- Remove synthetic data and re-fit with real race data

Perfect for league organizers or anyone who wants consistent AI competition across different tracks and classes.

### 2. **Fix Qualy Times** ⏱️

RaceRoom sometimes saves race results with missing qualification times (`qualTimeMs: -1`). This tool:

- Reads your qualification session file
- Matches drivers between quali and race sessions
- Patches the race results with correct qualification lap times
- Generates a corrected file ready for your records

### 3. **Build Results Database** 🏆

Inspired by [@pixeljetstream's r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship), this feature:

- Analyzes multiple race result files from a folder
- Calculates championship standings with points, wins, podiums
- Generates beautiful HTML reports with official RaceRoom car and track icons
- Caches assets for offline use
- Creates standalone HTML files you can share with your league

### 4. **Results Database Viewer** 📊

- Browse all your saved championships
- Search and filter by car, track, or championship name
- View detailed driver, team, and vehicle standings
- Export HTML reports or JSON data

### 5. **Settings & Configuration** ⚙️

- Customize fitting parameters
- Configure validation thresholds
- Manage game data files
- Clear cached assets when needed

## Technical Highlights

- **Cross-platform**: Desktop app (Electron) or web browser
- **Modern tech stack**: React + TypeScript with a clean, responsive UI
- **Local storage**: All data stays on your machine (electron-store for desktop, localStorage for web)
- **No backend required**: Completely self-contained application
- **Open source**: MIT License - contributions welcome!

## Credits

This project builds upon the fantastic work of **pixeljetstream**:

- AI fitting algorithms from [r3e-adaptive-ai-primer](https://github.com/pixeljetstream/r3e-adaptive-ai-primer)
- Championship standings logic from [r3e-open-championship](https://github.com/pixeljetstream/r3e-open-championship)

The toolbox consolidates these tools into a single, user-friendly interface with additional features and enhancements.

## Getting Started

1. **Download** the [Windows installer](https://github.com/deggesim/r3e-toolbox/releases/latest) or use the [web version](https://r3e-toolbox.up.railway.app)
2. **Load your r3e-data.json** file (the app can auto-detect it from your RaceRoom installation)
3. **Choose your tool** from the sidebar and start processing your race data!

Full documentation and user guide available in the [GitHub repository](https://github.com/deggesim/r3e-toolbox).

## Screenshots

_(The desktop app includes a clean, modern interface with sidebar navigation, real-time processing logs, and instant preview of results)_

## What's Next?

I'm actively developing this tool and would love to hear your feedback! Whether you're:

- A league organizer managing championships
- A solo racer fine-tuning AI competition
- A data enthusiast tracking your stats

I'd be grateful for any suggestions, bug reports, or feature requests.

## ☕ Support the Project

If this tool saves you time and enhances your RaceRoom experience, consider supporting its development:

**[Buy me a coffee on Ko-fi](https://ko-fi.com/deggesim)** ☕

Your support helps maintain and improve the toolbox with new features and updates!

## Links

- **GitHub Repository**: https://github.com/deggesim/r3e-toolbox
- **Support on Ko-fi**: https://ko-fi.com/deggesim
- **Download Latest Release**: https://github.com/deggesim/r3e-toolbox/releases/latest
- **Web Version**: https://r3e-toolbox.up.railway.app
- **User Guide**: [Included in the app and repository](https://github.com/deggesim/r3e-toolbox/blob/main/src/docs/USER_GUIDE.md)

## Version History

Currently at **v1.2.0** with:

- Floating processing logs for better UX
- Application menu integration
- Enhanced UI consistency
- Stable production-ready release

---

Feel free to try it out and let me know what you think! Questions, suggestions, and contributions are always welcome.

Happy racing! 🏁

_Simone De Gennaro_
