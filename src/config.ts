// Global application configuration for fitting and UI controls
export const CFG = {
  // Prediction range
  minAI: 80,
  maxAI: 120,

  // Fitting behaviour
  fitAll: false, // If true, fit all individual lap times; otherwise fit averaged times per AI level
  testMinAIdiffs: 2, // Minimum difference between min and max AI levels required to attempt fitting
  testMaxTimePct: 0.1, // Maximum deviation tolerance (percentage of minimum lap time)
  testMaxFailsPct: 0.1, // Maximum allowed failure rate for validation

  // UI application parameters
  aiNumLevels: 5, // Number of AI levels to apply around the selected level
  aiSpacing: 1, // Step between AI levels when applying changes
};
