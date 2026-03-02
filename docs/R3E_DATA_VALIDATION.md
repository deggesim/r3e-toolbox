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

1. ✅ Numeric class ID (key must be numeric string)
2. ✅ Valid class structure (must be object)
3. ✅ Presence of `Id` (must be number)
4. ✅ Presence of `Name` (must be string)
5. ⚠️ ID consistency check (key vs Id value)
6. ⚠️ Optional `Cars` array validation (if present, must be array with numeric Ids)
7. ✅ At least one valid class required

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

1. ✅ Numeric track ID (key must be numeric string)
2. ✅ Valid track structure (must be object)
3. ✅ Presence of `Id` (must be number)
4. ✅ Presence of `Name` (must be string)
5. ✅ Presence of `layouts` array (must be array, not empty)
6. ⚠️ ID consistency check (key vs Id value)
7. ✅ Each layout has valid structure (must be object)
8. ✅ Each layout has `Id` and `Name`
9. ⚠️ Optional fields: `MaxNumberOfVehicles` (must be number if present)
10. ⚠️ Optional fields: `Track` (must be number if present)
11. ✅ At least one valid track required

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

| Error                                          | Description                             | Action                  |
| ---------------------------------------------- | --------------------------------------- | ----------------------- |
| `Invalid data: must be a valid JSON object`    | Data is not a valid JSON object         | Verify file format      |
| `Missing or invalid 'classes' property`        | classes property missing or not object  | Verify JSON structure   |
| `Missing or invalid 'tracks' property`         | tracks property missing or not object   | Verify JSON structure   |
| `Class ID 'X' is not numeric`                  | Class key is not a number               | Fix key format          |
| `Class X: invalid data structure`              | Class entry is malformed                | Verify class object     |
| `Class X: missing or invalid 'Id' field`       | Class without numeric ID                | Add ID to class         |
| `Class X: missing or invalid 'Name' field`     | Class without string name               | Add Name to class       |
| `Track ID 'X' is not numeric`                  | Track key is not a number               | Fix key format          |
| `Track X: invalid data structure`              | Track entry is malformed                | Verify track object     |
| `Track X: missing or invalid 'Id' field`       | Track without numeric ID                | Add ID to track         |
| `Track X: missing or invalid 'Name' field`     | Track without string name               | Add Name to track       |
| `Track X: missing or invalid 'layouts' array`  | Track without layouts array             | Add at least one layout |
| `Track X, layout Y: invalid layout structure`  | Layout entry is malformed               | Verify layout object    |
| `Track X, layout Y: missing or invalid 'Id'`   | Layout without numeric ID               | Add ID to layout        |
| `Track X, layout Y: missing or invalid 'Name'` | Layout without string name              | Add Name to layout      |
| `No valid classes found in data`               | No valid class present after validation | Verify classes content  |
| `No valid tracks found in data`                | No valid track present after validation | Verify tracks content   |

### Warnings (Non-blocking)

| Warning                                                    | Description                          | Impact                         |
| ---------------------------------------------------------- | ------------------------------------ | ------------------------------ |
| `No classes found in data`                                 | classes object is empty              | No classes available           |
| `No tracks found in data`                                  | tracks object is empty               | No tracks available            |
| `Class X: ID mismatch (key: Y, Id: Z)`                     | Key differs from Id value            | May cause confusion, but works |
| `Class X: 'Cars' is not an array`                          | Cars property malformed              | Cars may not appear            |
| `Class X: N cars with invalid structure`                   | Cars entries are malformed           | Cars may not appear            |
| `Track X: ID mismatch (key: Y, Id: Z)`                     | Key differs from Id value            | May cause confusion, but works |
| `Track X (name): no layouts defined`                       | Track layouts array is empty         | Track not usable               |
| `Track X, layout Y: 'MaxNumberOfVehicles' is not a number` | Invalid type for MaxNumberOfVehicles | Display may be affected        |
| `Track X, layout Y: 'Track' reference is not a number`     | Invalid type for Track reference     | Reference may be invalid       |
| `'cars' property exists but is not an object`              | cars key is malformed                | Additional car data not used   |
| `'teams' property exists but is not an object`             | teams key is malformed               | Additional team data not used  |

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

---

**Last Updated:** February 26, 2026 | **Version:** 1.3.2
