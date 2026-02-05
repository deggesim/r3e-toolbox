import type { RaceRoomData, RaceRoomClass, RaceRoomTrack } from "../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the structure of r3e-data.json file
 * Ensures all required fields are present and properly formatted
 */
export const validateR3eData = (data: unknown): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Invalid data: must be a valid JSON object"],
      warnings: [],
    };
  }

  const gameData = data as Partial<RaceRoomData>;

  // Validate required top-level properties
  if (!gameData.classes || typeof gameData.classes !== "object") {
    errors.push("Missing or invalid 'classes' property");
  }

  if (!gameData.tracks || typeof gameData.tracks !== "object") {
    errors.push("Missing or invalid 'tracks' property");
  }

  // Optional properties validation
  if (gameData.cars !== undefined && typeof gameData.cars !== "object") {
    warnings.push("'cars' property exists but is not an object");
  }

  if (gameData.teams !== undefined && typeof gameData.teams !== "object") {
    warnings.push("'teams' property exists but is not an object");
  }

  // If critical errors exist, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate classes structure
  const classValidation = validateClasses(gameData.classes!);
  errors.push(...classValidation.errors);
  warnings.push(...classValidation.warnings);

  // Validate tracks structure
  const trackValidation = validateTracks(gameData.tracks!);
  errors.push(...trackValidation.errors);
  warnings.push(...trackValidation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates the classes object structure
 */
const validateClasses = (
  classes: Record<string, unknown>,
): Pick<ValidationResult, "errors" | "warnings"> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const classIds = Object.keys(classes);

  if (classIds.length === 0) {
    warnings.push("No classes found in data");
    return { errors, warnings };
  }

  let validClasses = 0;
  let invalidClasses = 0;

  for (const classId of classIds) {
    const classData = classes[classId];

    // Validate class ID is numeric
    if (isNaN(Number(classId))) {
      errors.push(`Class ID '${classId}' is not numeric`);
      invalidClasses++;
      continue;
    }

    // Validate class structure
    if (!classData || typeof classData !== "object") {
      errors.push(`Class ${classId}: invalid data structure`);
      invalidClasses++;
      continue;
    }

    const cls = classData as Partial<RaceRoomClass>;

    // Required fields
    if (cls.Id === undefined || typeof cls.Id !== "number") {
      errors.push(`Class ${classId}: missing or invalid 'Id' field`);
      invalidClasses++;
      continue;
    }

    if (!cls.Name || typeof cls.Name !== "string") {
      errors.push(`Class ${classId}: missing or invalid 'Name' field`);
      invalidClasses++;
      continue;
    }

    // Validate ID consistency
    if (cls.Id !== Number(classId)) {
      warnings.push(
        `Class ${classId}: ID mismatch (key: ${classId}, Id: ${cls.Id})`,
      );
    }

    // Optional Cars array validation
    if (cls.Cars !== undefined) {
      if (!Array.isArray(cls.Cars)) {
        warnings.push(`Class ${classId}: 'Cars' is not an array`);
      } else {
        const invalidCars = cls.Cars.filter(
          (car: unknown) =>
            !car || typeof (car as { Id?: unknown }).Id !== "number",
        );
        if (invalidCars.length > 0) {
          warnings.push(
            `Class ${classId}: ${invalidCars.length} cars with invalid structure`,
          );
        }
      }
    }

    validClasses++;
  }

  if (validClasses === 0 && invalidClasses > 0) {
    errors.push("No valid classes found in data");
  }

  return { errors, warnings };
};

/**
 * Validates the tracks object structure
 */
const validateTracks = (
  tracks: Record<string, unknown>,
): Pick<ValidationResult, "errors" | "warnings"> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trackIds = Object.keys(tracks);

  if (trackIds.length === 0) {
    warnings.push("No tracks found in data");
    return { errors, warnings };
  }

  let validTracks = 0;
  let invalidTracks = 0;

  for (const trackId of trackIds) {
    const trackData = tracks[trackId];

    // Validate track ID is numeric
    if (isNaN(Number(trackId))) {
      errors.push(`Track ID '${trackId}' is not numeric`);
      invalidTracks++;
      continue;
    }

    // Validate track structure
    if (!trackData || typeof trackData !== "object") {
      errors.push(`Track ${trackId}: invalid data structure`);
      invalidTracks++;
      continue;
    }

    const track = trackData as Partial<RaceRoomTrack>;

    // Required fields
    if (track.Id === undefined || typeof track.Id !== "number") {
      errors.push(`Track ${trackId}: missing or invalid 'Id' field`);
      invalidTracks++;
      continue;
    }

    if (!track.Name || typeof track.Name !== "string") {
      errors.push(`Track ${trackId}: missing or invalid 'Name' field`);
      invalidTracks++;
      continue;
    }

    // Validate ID consistency
    if (track.Id !== Number(trackId)) {
      warnings.push(
        `Track ${trackId}: ID mismatch (key: ${trackId}, Id: ${track.Id})`,
      );
    }

    // Required layouts array
    if (!track.layouts || !Array.isArray(track.layouts)) {
      errors.push(`Track ${trackId}: missing or invalid 'layouts' array`);
      invalidTracks++;
      continue;
    }

    if (track.layouts.length === 0) {
      warnings.push(`Track ${trackId} (${track.Name}): no layouts defined`);
    }

    // Validate each layout
    for (let i = 0; i < track.layouts.length; i++) {
      const layout = track.layouts[i];

      if (!layout || typeof layout !== "object") {
        errors.push(`Track ${trackId}, layout ${i}: invalid layout structure`);
        continue;
      }

      if (typeof layout.Id !== "number") {
        errors.push(
          `Track ${trackId}, layout ${i}: missing or invalid 'Id' field`,
        );
      }

      if (!layout.Name || typeof layout.Name !== "string") {
        errors.push(
          `Track ${trackId}, layout ${i}: missing or invalid 'Name' field`,
        );
      }

      // Optional but commonly expected fields
      if (
        layout.MaxNumberOfVehicles !== undefined &&
        typeof layout.MaxNumberOfVehicles !== "number"
      ) {
        warnings.push(
          `Track ${trackId}, layout ${layout.Name}: 'MaxNumberOfVehicles' is not a number`,
        );
      }

      if (layout.Track !== undefined && typeof layout.Track !== "number") {
        warnings.push(
          `Track ${trackId}, layout ${layout.Name}: 'Track' reference is not a number`,
        );
      }
    }

    validTracks++;
  }

  if (validTracks === 0 && invalidTracks > 0) {
    errors.push("No valid tracks found in data");
  }

  return { errors, warnings };
};

/**
 * Validates and parses r3e-data.json content
 * Throws an error with detailed message if validation fails
 */
export const parseAndValidateR3eData = (content: string): RaceRoomData => {
  let parsed: unknown;

  // Step 1: Parse JSON
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON: ${message}`);
  }

  // Step 2: Validate structure
  const validation = validateR3eData(parsed);

  if (!validation.valid) {
    const errorMessage = [
      "Invalid r3e-data.json structure:",
      "",
      ...validation.errors.map((err) => `  ❌ ${err}`),
    ].join("\n");

    throw new Error(errorMessage);
  }

  // Step 3: Log warnings if any (non-blocking)
  if (validation.warnings.length > 0) {
    console.warn("r3e-data.json validation warnings:");
    validation.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
  }

  return parsed as RaceRoomData;
};

/**
 * Quick validation check without detailed error messages
 * Useful for pre-validation before attempting full parse
 */
export const isValidR3eDataStructure = (data: unknown): boolean => {
  if (!data || typeof data !== "object") return false;

  const gameData = data as Partial<RaceRoomData>;

  // Check essential structure
  return (
    gameData.classes !== undefined &&
    typeof gameData.classes === "object" &&
    gameData.tracks !== undefined &&
    typeof gameData.tracks === "object" &&
    Object.keys(gameData.classes).length > 0 &&
    Object.keys(gameData.tracks).length > 0
  );
};
