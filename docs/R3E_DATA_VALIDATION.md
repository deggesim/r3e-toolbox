# r3e-data.json Validation

## Overview

The validation system ensures that the `r3e-data.json` file loaded (manually or automatically) respects the correct structure required by the R3E Toolbox application.

## Architecture

### Main File

- **`src/utils/r3eDataValidator.ts`**: Contains all validation functions

### Integration Points

- **`src/components/GameDataOnboarding.tsx`**: Initial loading (automatic and manual)
- **`src/store/gameDataStore.ts`**: Zustand store for validated data

## Validated Structure

### Required Properties

```typescript
{
  classes: Record<string, RaceRoomClass>,  // At least 1 class required
  tracks: Record<string, RaceRoomTrack>    // At least 1 track required
}
```

### Optional Properties

```typescript
{
  cars?: Record<string, RaceRoomCar>,
  teams?: Record<string, RaceRoomTeam>,
  liveries?: Record<string, any>,
  layouts?: Record<string, any>
}
```

## Class Validation

Each class must have:

- **`Id`** (number): Unique numeric ID
- **`Name`** (string): Class name
- **`Cars`** (array, optional): List of cars with numeric `Id`

### Checks Performed

1. ✅ Presence of `Id` and `Name`
2. ✅ Correct types (number for Id, string for Name)
3. ⚠️ ID consistency (key must match `Id`)
4. ⚠️ Cars array validity (if present)

## Track Validation

Each track must have:

- **`Id`** (number): Unique numeric ID
- **`Name`** (string): Circuit name
- **`layouts`** (array): At least one layout defined

Each layout must have:

- **`Id`** (number): Unique numeric layout ID
- **`Name`** (string): Layout name
- **`Track`** (number, optional): Reference to parent track
- **`MaxNumberOfVehicles`** (number, optional): Maximum number of vehicles

### Checks Performed

1. ✅ Presence of `Id`, `Name`, `layouts`
2. ✅ Correct types for all fields
3. ✅ Non-empty layouts array
4. ✅ Each layout has valid `Id` and `Name`
5. ⚠️ Track/layout ID consistency
6. ⚠️ Optional fields validity

## API Functions

### `validateR3eData(data: unknown): ValidationResult`

Validates the complete data structure.

**Parameters:**

- `data`: Object to validate (type `unknown`)

**Returns:**

```typescript
{
  valid: boolean,           // true if no critical errors
  errors: string[],         // Blocking errors
  warnings: string[]        // Non-blocking warnings
}
```

**Example:**

```typescript
const validation = validateR3eData(jsonData);
if (!validation.valid) {
  console.error("Errors:", validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn("Warnings:", validation.warnings);
}
```

### `parseAndValidateR3eData(content: string): RaceRoomData`

Parses JSON and validates in a single operation. Throws an exception if validation fails.

**Parameters:**

- `content`: JSON string of the r3e-data.json file

**Returns:**

- `RaceRoomData`: Validated and typed data

**Raises:**

- `Error`: With detailed message if parsing or validation fails

**Example:**

```typescript
try {
  const gameData = parseAndValidateR3eData(fileContent);
  // Use validated gameData
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

### `isValidR3eDataStructure(data: unknown): boolean`

Quick validity check without detailed messages.

**Parameters:**

- `data`: Object to verify

**Returns:**

- `boolean`: true if minimum structure is valid

**Example:**

```typescript
if (isValidR3eDataStructure(parsedJson)) {
  // Proceed with full validation
}
```

## Validation Flow

### Automatic Loading (Electron)

```
┌─────────────────────────┐
│ Electron IPC Request    │
│ findR3eDataFile()       │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ File found in standard  │
│ RaceRoom path           │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ parseAndValidateR3eData │
│ - Parse JSON            │
│ - Validate structure    │
│ - Log warnings          │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ Error?  │
       └────┬────┘
       No   │   Yes
            v    v
    ┌───────┐  ┌──────────────┐
    │ Store │  │ Show error   │
    │ data  │  │ to user      │
    └───────┘  └──────────────┘
```

### Manual Loading (File Upload)

```
┌─────────────────────────┐
│ User selects file       │
│ r3e-data.json           │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ file.text()             │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│ parseAndValidateR3eData │
│ - Parse JSON            │
│ - Validate structure    │
│ - Log warnings          │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ Error?  │
       └────┬────┘
       No   │   Yes
            v    v
    ┌───────┐  ┌──────────────┐
    │ Store │  │ Show error   │
    │ data  │  │ in form      │
    └───────┘  └──────────────┘
```

## Error Messages

### Critical Errors (Blocking)

| Error                                         | Description                            | Action                  |
| --------------------------------------------- | -------------------------------------- | ----------------------- |
| `Invalid data: must be a valid JSON object`   | Data is not a valid JSON object        | Verify file format      |
| `Missing or invalid 'classes' property`       | classes property missing or not object | Verify JSON structure   |
| `Missing or invalid 'tracks' property`        | tracks property missing or not object  | Verify JSON structure   |
| `Class X: missing or invalid 'Id' field`      | Class without numeric ID               | Add ID to class         |
| `Track X: missing or invalid 'layouts' array` | Track without layouts                  | Add at least one layout |
| `No valid classes found in data`              | No valid class present                 | Verify classes content  |
| `No valid tracks found in data`               | No valid track present                 | Verify tracks content   |

### Warnings (Non-blocking)

| Warning                                  | Description           | Impact                         |
| ---------------------------------------- | --------------------- | ------------------------------ |
| `Class X: ID mismatch`                   | Key different from Id | May cause confusion, but works |
| `Track X: no layouts defined`            | Track without layouts | Track not usable               |
| `Class X: N cars with invalid structure` | Malformed cars        | Cars may not appear            |

## Testing

Run validation tests:

```bash
npm run test src/utils/__tests__/r3eDataValidator.test.ts
```

### Test Coverage

- ✅ Correct structure validation
- ✅ Rejection of null/undefined data
- ✅ Rejection of missing properties
- ✅ Class validation (Id, Name, Cars)
- ✅ Track validation (Id, Name, layouts)
- ✅ ID mismatch detection
- ✅ JSON parsing with validation
- ✅ Handling of malformed JSON
- ✅ Quick structure check

## Practical Examples

### Minimal Valid File

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

### File with Error (Missing Id)

```json
{
  "classes": {
    "1": {
      "Name": "GT3"
      // ❌ Missing Id
    }
  },
  "tracks": { ... }
}
```

**Returned error:**

```
Invalid r3e-data.json structure:
  ❌ Class 1: missing or invalid 'Id' field
```

### File with Warning (ID Mismatch)

```json
{
  "classes": {
    "1": {
      "Id": 2,  // ⚠️ Key is "1", but Id is 2
      "Name": "GT3"
    }
  },
  "tracks": { ... }
}
```

**Returned warning:**

```
⚠️ Class 1: ID mismatch (key: 1, Id: 2)
```

## Maintenance

### Adding New Validations

1. Update functions in `r3eDataValidator.ts`
2. Add corresponding tests in `__tests__/r3eDataValidator.test.ts`
3. Document new rules in this file
4. Run tests: `npm run test`

### Modifying Validated Structure

If the structure of `RaceRoomData` changes:

1. Update `src/types.ts`
2. Update validation logic in `r3eDataValidator.ts`
3. Update tests
4. Update this documentation

## Best Practices

1. **Always validate**: Never do direct `JSON.parse()` without validation
2. **Handle errors**: Show clear messages to the user
3. **Log warnings**: Warnings go to console, don't block
4. **Test edge cases**: Test with real game files
5. **Back up data**: Encourage users to back up before modifications

## Troubleshooting

### "Missing or invalid 'classes' property"

- Verify that the JSON has `"classes": { ... }`
- Make sure it's an object, not an array

### "No valid classes found in data"

- Verify that each class has `Id` (number) and `Name` (string)
- Check JSON format with an online tool

### "Track X: missing or invalid 'layouts' array"

- Each track must have `layouts` array
- Array cannot be empty (warning) but must exist

### Corrupted r3e-data.json File

1. Download again from RaceRoom installation
2. Standard path: `RaceRoom Racing Experience/Game/GameData/General/r3e-data.json`
3. Use online JSON validation tool to verify syntax

## Useful Links

- [TypeScript Types Documentation](../types.ts)
- [GameDataOnboarding Component](../../components/GameDataOnboarding.tsx)
- [Game Data Store](../../store/gameDataStore.ts)
