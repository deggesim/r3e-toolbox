import type { Database, ProcessedDatabase } from "../types";
import { fitLinear, computeTime } from "./fitting";
import { CFG } from "../config";

/**
 * Generates a linear fitting function for a track's AI lap times.
 * Uses existing sampled data (min/max AI levels) to create a linear regression model.
 * Returns a function that can predict lap times for any AI level between 80-120.
 * Returns undefined if the track doesn't have enough data or if validation fails.
 */
function trackGenerator(
  _classid: string,
  _trackid: string,
  track: any
): ((t: number) => number) | undefined {
  // Validate: need at least testMinAIdiffs difference between min and max AI levels
  if (!track.maxAI || track.maxAI - track.minAI < CFG.testMinAIdiffs)
    return undefined;

  // Prepare data for linear regression: x = AI levels, y = lap times
  const x: number[] = [];
  const y: number[] = [];

  // Collect data points: either all individual lap times or averaged times per AI level
  if (CFG.fitAll) {
    // Use all individual lap times for fitting
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const times = track.ailevels[i] || [];
      for (const time of times) {
        x.push(i);
        y.push(time);
      }
    }
  } else {
    // Use averaged lap time per AI level
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const { num, avg: time } = computeTime(track.ailevels[i] || []);
      if (num > 0) {
        x.push(i);
        y.push(time);
      }
    }
  }

  // Linear regression: fit y = a + b*x where y is lap time and x is AI level
  // (quadratic term c is reserved for future enhancement)
  const { a, b } = fitLinear(x, y);
  const c = 0;

  const generator = (t: number) => a + b * t + (c || 0) * (t * t);

  // Validate fit quality: check that predicted times deviate by less than testMaxTimePct from actual data
  const { avg: minTime } = computeTime(track.ailevels[track.minAI] || []);
  const threshold = minTime * CFG.testMaxTimePct;

  let tested = 0;
  let passed = 0;

  if (CFG.fitAll) {
    let lasttime: number | undefined;
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const base = generator(i);
      const { num, avg: time } = computeTime(track.ailevels[i] || []);
      if (num > 0) {
        tested++;
        const diff = Math.abs(base - time);
        if (diff < threshold) {
          passed++;
        }
      }
      if (base > (lasttime || base)) {
        // Lap times must decrease monotonically with increasing AI skill level
        return undefined;
      }
      lasttime = base;
    }
  } else {
    let lasttime: number | undefined;
    for (let i = track.minAI; i <= track.maxAI; i++) {
      const base = generator(i);
      const times = track.ailevels[i] || [];
      for (const time of times) {
        tested++;
        const diff = Math.abs(base - time);
        if (diff < threshold) {
          passed++;
        }
      }
      if (base > (lasttime || base)) {
        // Lap times must decrease monotonically with increasing AI skill level
        return undefined;
      }
      lasttime = base;
    }
  }

  // Accept the fit only if at most testMaxFailsPct of tested points deviate beyond threshold
  const accepted = tested - passed <= Math.max(1, tested * CFG.testMaxFailsPct);
  return accepted ? generator : undefined;
}

/**
 * Process the database to generate AI level predictions for all tracks/classes.
 * For each track with sufficient data points, a linear fit is computed and used
 * to generate predicted lap times for AI levels 80-120 in 1-point increments.
 */
export function processDatabase(database: Database): ProcessedDatabase {
  const filtered: ProcessedDatabase = { classes: {} };

  // Iterate through all classes and tracks to build prediction generators
  for (const [classid, classData] of Object.entries(database.classes)) {
    for (const [trackid, track] of Object.entries(classData.tracks)) {
      // Generate fitting function if track has sufficient data
      const gen = trackGenerator(classid, trackid, track);
      if (gen) {
        // Store generated predictions: ensure class exists and set min/max AI range
        const classf = filtered.classes[classid] || { tracks: {} };
        filtered.classes[classid] = classf;

        classf.minAI = CFG.minAI;
        classf.maxAI = CFG.maxAI;

        // Generate predicted lap times for AI levels CFG.minAI to CFG.maxAI
        const ailevels: Record<number, number[]> = {};
        for (let i = CFG.minAI; i <= CFG.maxAI; i++) {
          // Round predictions to 2 decimal places for consistency
          ailevels[i] = [parseFloat(gen(i).toFixed(2))];
        }

        const trackf = {
          minAI: CFG.minAI,
          maxAI: CFG.maxAI,
          ailevels,
          samplesCount: {},
        };
        classf.tracks[trackid] = trackf;
      }
    }
  }

  return filtered;
}
