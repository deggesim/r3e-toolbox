/**
 * Parse a time string in HH:MM:SS.ffff or MM:SS.ffff format into total seconds.
 * Handles both with and without hours component.
 */
export const parseTime = (str: string): number | undefined => {
  if (!str) return undefined;
  // Try format with hours first: HH:MM:SS.ffff
  const hMatch = str.match(/(\d+):(\d+):([0-9.]+)/);
  if (hMatch) {
    return (
      parseInt(hMatch[1]) * 3600 +
      parseInt(hMatch[2]) * 60 +
      parseFloat(hMatch[3])
    );
  }
  // Try format without hours: MM:SS.ffff
  const mMatch = str.match(/(\d+):([0-9.]+)/);
  if (mMatch) {
    return parseInt(mMatch[1]) * 60 + parseFloat(mMatch[2]);
  }
  return undefined;
};

/**
 * Format total seconds into a time string HH:MM:SS.mmm or MM:SS.mmm format.
 * Zero-pads seconds when < 10. Separator (colon) can be customized.
 */
export const makeTime = (s: number, sep: string = ":"): string => {
  const h = Math.floor(s / 3600);
  s = s - h * 3600;
  const m = Math.floor(s / 60);
  s = s - m * 60;

  // Format seconds: zero-pad integer part, keep fractional part (milliseconds only)
  const secInt = Math.floor(s);
  const secDec = (s - secInt).toFixed(3).substring(1); // extracts fractional part as ".mmm"
  const secStr = (secInt < 10 ? "0" : "") + secInt + secDec;

  // Include hours only if needed
  return (h > 0 ? h.toString() + sep : "") + m.toString() + sep + secStr;
};

/**
 * Compute statistics from an array of lap times.
 * Returns [count, average, standard_deviation].
 * Used to analyze fit quality and player performance.
 */
export const computeTime = (times: number[]): [number, number, number] => {
  const num = times?.length || 0;
  if (num < 1) return [0, 0, 0];

  // Calculate average
  let avgtime = 0;
  for (const time of times) {
    avgtime += time;
  }
  avgtime /= num;

  // Calculate standard deviation (variance's square root)
  let variance = 0;
  for (const time of times) {
    const diff = time - avgtime;
    variance += diff * diff;
  }
  variance = Math.sqrt(variance);

  return [num, avgtime, variance];
};

export const outputTime = (time: number): string => {
  return time.toFixed(2);
};
