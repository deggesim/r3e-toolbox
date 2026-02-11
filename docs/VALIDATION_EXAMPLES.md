# r3e-data.json Validation Examples

This document contains practical examples of using the validation system.

## Using the Validation API

### Example 1: Loading Game Data with Error Handling

```typescript
import { parseAndValidateR3eData } from "../utils/r3eDataValidator";

async function loadGameData(fileContent: string) {
  try {
    const gameData = parseAndValidateR3eData(fileContent);
    console.log("✅ Game data loaded successfully");
    console.log(`Classes: ${Object.keys(gameData.classes).length}`);
    console.log(`Tracks: ${Object.keys(gameData.tracks).length}`);
    return gameData;
  } catch (error) {
    console.error("❌ Failed to load game data:", error.message);
    return null;
  }
}
```

### Example 2: Validating Data with Detailed Messages

```typescript
import { validateR3eData } from "../utils/r3eDataValidator";

function validateAndReport(data: unknown) {
  const result = validateR3eData(data);

  if (!result.valid) {
    console.error("❌ Validation failed:");
    result.errors.forEach((err) => console.error(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.warn("⚠️ Warnings:");
    result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
  }

  return result.valid;
}
```

### Example 3: Quick Structure Check

```typescript
import { isValidR3eDataStructure } from "../utils/r3eDataValidator";

function canUseFile(parsedJson: unknown): boolean {
  if (!isValidR3eDataStructure(parsedJson)) {
    console.warn("File structure not compatible");
    return false;
  }
  // Proceed with full validation
  return true;
}
```

## Integration with Components

### GameDataOnboarding Component Integration

```typescript
const handleFileUpload = async (file: File) => {
  const fileContent = await file.text();

  try {
    const gameData = parseAndValidateR3eData(fileContent);
    setGameData(gameData);
    setError(null);
    addLog("success", "Game data loaded successfully");
  } catch (error) {
    setError(error.message);
    addLog("error", error.message);
  }
};
```

### Store Integration

```typescript
import { useGameDataStore } from "../store/gameDataStore";

function MyComponent() {
  const { gameData, setGameData } = useGameDataStore();

  if (!gameData) {
    return <p>Game data not loaded. Use GameDataOnboarding to load it.</p>;
  }

  return (
    <div>
      <h3>Loaded Game Data</h3>
      <p>Classes: {Object.keys(gameData.classes).length}</p>
      <p>Tracks: {Object.keys(gameData.tracks).length}</p>
    </div>
  );
}
```

## Testing Validation

### Running Tests

```bash
# Run all tests
npm test

# Run only validation tests
npm test src/utils/__tests__/r3eDataValidator.test.ts

# Run with watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Testing with Real Files

```bash
# Extract your real r3e-data.json
# Location: RaceRoom Racing Experience/Game/GameData/General/r3e-data.json

# In a Node.js REPL or test file:
const fs = require("fs");
const { parseAndValidateR3eData } = require("./src/utils/r3eDataValidator");

const content = fs.readFileSync("./r3e-data.json", "utf-8");
try {
  const data = parseAndValidateR3eData(content);
  console.log("✅ Real file valid");
} catch (error) {
  console.error("❌", error.message);
}
```

## Practical Examples

### Example 1: Valid File - Minimal Structure

**File content:**

```json
{
  "classes": {
    "1": {
      "Id": 1,
      "Name": "GT3"
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": [
        {
          "Id": 263,
          "Name": "Grand Prix"
        }
      ]
    }
  }
}
```

**Result:**

```
✅ Validation passed
  - Classes: 1
  - Tracks: 1
  - Layouts: 1
```

### Example 2: Class Missing ID Field

**File content:**

```json
{
  "classes": {
    "1": {
      "Name": "GT3"
      // ❌ Missing "Id" field
    }
  },
  "tracks": { ... }
}
```

**Expected output:**

```
❌ Invalid r3e-data.json structure:
  - Class 1: missing or invalid 'Id' field
```

**Error code (TypeScript):**

```typescript
const result = validateR3eData(data);
// result.valid = false
// result.errors[0] = "Class 1: missing or invalid 'Id' field"
```

### Example 3: Track ID Mismatch

**File content:**

```json
{
  "classes": { ... },
  "tracks": {
    "1": {
      "Id": 262,  // ⚠️ Mismatch: key is "1", Id is "262"
      "Name": "RaceRoom Raceway",
      "layouts": [{ "Id": 263, "Name": "Grand Prix" }]
    }
  }
}
```

**Expected output:**

```
⚠️ Track 1: ID mismatch (key: 1, Id: 262)
```

**Behavior:**

- File is still valid (validation passes)
- Warning logged for developer awareness
- Component can still use the data

### Example 4: Empty Layouts Array

**File content:**

```json
{
  "classes": { ... },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": []  // ❌ Empty array
    }
  }
}
```

**Expected output:**

```
⚠️ Track 262: empty layouts array
```

**Note:** This is a warning, not a blocking error. The track exists but has no usable layouts.

### Example 5: Malformed JSON

**File content:**

```json
{
  "classes": {
    "1": {
      "Id": 1,
      "Name": "GT3"
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": [
        {
          "Id": 263,
          "Name": "Grand Prix"
          // ❌ Missing closing brace for this object
      ]
    }
  }
}
```

**Expected output:**

```
❌ JSON parsing failed: Unexpected end of JSON input
```

**Error handling:**

```typescript
try {
  const data = parseAndValidateR3eData(content);
} catch (error) {
  // error.message contains the JSON parsing error message
}
```

### Example 6: Real-World Complex File

**Simplified excerpt of real r3e-data.json:**

```json
{
  "classes": {
    "1": {
      "Id": 1,
      "Name": "GT3",
      "Cars": [
        { "Id": 4, "Name": "Aston Martin Vantage GT3" },
        { "Id": 5, "Name": "BMW M6 GT3" }
      ]
    },
    "2": {
      "Id": 2,
      "Name": "IMSA GTE",
      "Cars": [{ "Id": 13, "Name": "Aston Martin Vantage GTE" }]
    }
  },
  "tracks": {
    "262": {
      "Id": 262,
      "Name": "RaceRoom Raceway",
      "layouts": [
        { "Id": 263, "Name": "Grand Prix", "MaxNumberOfVehicles": 45 },
        { "Id": 264, "Name": "Short Circuit", "MaxNumberOfVehicles": 45 },
        { "Id": 265, "Name": "National", "MaxNumberOfVehicles": 45 }
      ]
    },
    "274": {
      "Id": 274,
      "Name": "Red Bull Ring",
      "layouts": [
        { "Id": 275, "Name": "Grand Prix", "MaxNumberOfVehicles": 30 }
      ]
    }
  }
}
```

**Validation result:**

```
✅ Validation passed
  - Classes: 2
    - 1: GT3 (2 cars)
    - 2: IMSA GTE (1 car)
  - Tracks: 2
    - 262: RaceRoom Raceway (3 layouts)
    - 274: Red Bull Ring (1 layout)
  - Total layouts: 4
```

## Common Troubleshooting

### Problem: "No valid classes found in data"

**Cause:** Classes are present but structurally invalid

**Diagnosis:**

```typescript
const data = JSON.parse(fileContent);
console.log("Classes type:", typeof data.classes); // Should be "object"
console.log("Keys:", Object.keys(data.classes)); // Should have entries
for (const [key, cls] of Object.entries(data.classes)) {
  console.log(`Class ${key}:`, {
    hasId: "Id" in cls,
    idType: typeof cls.Id,
    hasName: "Name" in cls,
    nameType: typeof cls.Name,
  });
}
```

**Solution:**

- Ensure each class has numeric `Id` and string `Name`
- Verify no extra characters or typos in field names

### Problem: Validation passes but data seems incomplete

**Cause:** Warnings about missing optional fields

**Solution:**

```typescript
const validation = validateR3eData(data);
if (validation.warnings.length > 0) {
  console.warn("Data loaded but with warnings:");
  validation.warnings.forEach((w) => console.warn(`  - ${w}`));
}
// Data is still usable, just inform the user
```

### Problem: JSON type errors when using game data

**Cause:** Type definitions not matching runtime data

**Solution:**

```typescript
// Always validate before using
const result = validateR3eData(untrustedData);
if (!result.valid) {
  throw new Error("Invalid game data structure");
}
// Now safely cast
const gameData = untrustedData as RaceRoomData;
```

### Problem: File loads in browser but crashes in Electron

**Cause:** File encoding or permissions issues

**Solution:**

Use Electron's built-in file dialog:

```typescript
const { ipcRenderer } = require("electron");

const handleLoadFile = async () => {
  try {
    const content = await ipcRenderer.invoke("fs:readFile", filePath);
    const gameData = parseAndValidateR3eData(content);
    // File loaded successfully through Electron
  } catch (error) {
    console.error("Electron file load failed:", error);
  }
};
```

## Performance Considerations

### Large Files (>10 MB)

```typescript
// For very large r3e-data.json files, consider lazy loading:
async function loadGameDataAsync(fileContent: string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const data = parseAndValidateR3eData(fileContent);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    }, 0); // Yield to event loop
  });
}
```

### Caching Validated Data

```typescript
// Use Zustand store to avoid re-validation
const useGameDataStore = create<GameDataState>()(
  persist(
    (set) => ({
      gameData: null,
      setGameData: (data: RaceRoomData) => set({ gameData: data }),
    }),
    { name: "r3e-toolbox-gamedata" },
  ),
);

// Load once, reuse everywhere
if (!gameDataStore.getState().gameData) {
  const data = parseAndValidateR3eData(content);
  gameDataStore.setState({ gameData: data });
}
```

---

**Last Updated:** February 11, 2026 | **Version:** 0.4.3
