/**
 * Statistical fitting functions for AI lap time prediction.
 *
 * Based on algorithms from r3e-adaptive-ai-primer by pixeljetstream:
 * https://github.com/pixeljetstream/r3e-adaptive-ai-primer
 */

export interface FitResult {
  a: number; // Intercept (constant term)
  b: number; // Slope (linear coefficient)
  c?: number; // Quadratic coefficient (reserved for future parabolic fit)
}

/**
 * Linear least-squares regression: y = a + b*x
 * Uses closed-form normal equations: (A^T * A)^(-1) * A^T * Y
 * For 2-parameter linear fit this reduces to a direct 2×2 determinant solve.
 */
export const fitLinear = (xValues: number[], yValues: number[]): FitResult => {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    throw new Error(
      "Invalid input: x and y must have same length and at least 2 points",
    );
  }

  const n = xValues.length;
  let sx = 0, sx2 = 0, sy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const x = xValues[i];
    const y = yValues[i];
    sx += x;
    sx2 += x * x;
    sy += y;
    sxy += x * y;
  }

  // det(A^T * A) = n*Σx² - (Σx)²
  const det = n * sx2 - sx * sx;
  return {
    a: (sy * sx2 - sxy * sx) / det,
    b: (n * sxy - sx * sy) / det,
  };
};

/**
 * Parabolic least-squares regression: y = a + b*x + c*x²
 * Uses Gaussian elimination with partial pivoting on the 3×3 normal equations.
 */
export const fitParabola = (
  xValues: number[],
  yValues: number[],
): FitResult => {
  if (xValues.length !== yValues.length || xValues.length < 3) {
    throw new Error(
      "Invalid input: x and y must have same length and at least 3 points",
    );
  }

  const n = xValues.length;
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xValues[i];
    const x2 = x * x;
    const y = yValues[i];
    sx += x;
    sx2 += x2;
    sx3 += x2 * x;
    sx4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  // 3×3 augmented matrix [ATA | ATY]
  const m: number[][] = [
    [n,   sx,  sx2,  sy],
    [sx,  sx2, sx3,  sxy],
    [sx2, sx3, sx4,  sx2y],
  ];

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[maxRow][col])) maxRow = row;
    }
    [m[col], m[maxRow]] = [m[maxRow], m[col]];

    for (let row = col + 1; row < 3; row++) {
      const factor = m[row][col] / m[col][col];
      for (let k = col; k <= 3; k++) {
        m[row][k] -= factor * m[col][k];
      }
    }
  }

  // Back substitution
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = m[i][3];
    for (let j = i + 1; j < 3; j++) {
      x[i] -= m[i][j] * x[j];
    }
    x[i] /= m[i][i];
  }

  return { a: x[0], b: x[1], c: x[2] };
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
