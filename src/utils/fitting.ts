/**
 * Statistical fitting functions for AI lap time prediction.
 *
 * Based on algorithms from r3e-adaptive-ai-primer by pixeljetstream:
 * https://github.com/pixeljetstream/r3e-adaptive-ai-primer
 */

import { create, all } from "mathjs";

// MathJS instance for linear algebra operations (matrix multiply, solve, transpose)
const math = create(all);

export interface FitResult {
  a: number; // Intercept (constant term)
  b: number; // Slope (linear coefficient)
  c?: number; // Quadratic coefficient (reserved for future parabolic fit)
}

/**
 * Linear least-squares regression: y = a + b*x
 * Uses normal equations: (A^T * A)^(-1) * A^T * Y
 * Solves via LU decomposition for numerical stability.
 */
export const fitLinear = (xValues: number[], yValues: number[]): FitResult => {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    throw new Error(
      "Invalid input: x and y must have same length and at least 2 points",
    );
  }

  // Build design matrix: each row is [1, x_i] for intercept and slope
  const A = xValues.map((x) => [1, x]);
  const Y = yValues.map((y) => [y]);

  // Normal equations: A^T * A
  const AT = math.transpose(A);
  const ATA = math.multiply(AT, A);

  // Normal equations: A^T * Y
  const ATY = math.multiply(AT, Y);

  // Solve (A^T * A) * X = A^T * Y using LU decomposition
  const X = math.lusolve(ATA, ATY) as number[][];

  return { a: X[0][0], b: X[1][0] };
};

export const fitParabola = (
  xValues: number[],
  yValues: number[],
): FitResult => {
  if (xValues.length !== yValues.length || xValues.length < 3) {
    throw new Error(
      "Invalid input: x and y must have same length and at least 3 points",
    );
  }

  // Create matrices
  const A = xValues.map((x) => [1, x, x * x]);
  const Y = yValues.map((y) => [y]);

  // A^T * A
  const AT = math.transpose(A);
  const ATA = math.multiply(AT, A);

  // A^T * Y
  const ATY = math.multiply(AT, Y);

  // Solve ATA * X = ATY
  const X = math.lusolve(ATA, ATY) as number[][];

  return { a: X[0][0], b: X[1][0], c: X[2][0] };
};

export const computeTime = (
  times: number[],
): {
  num: number;
  avg: number;
  variance: number;
} => {
  const num = times?.length || 0;
  if (num < 1) return { num: 0, avg: 0, variance: 0 };

  const avg = times.reduce((sum, t) => sum + t, 0) / num;
  const variance = Math.sqrt(
    times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / num,
  );

  return { num, avg, variance };
};
