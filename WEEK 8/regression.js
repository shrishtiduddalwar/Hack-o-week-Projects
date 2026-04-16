// ============================================================
// POLYNOMIAL REGRESSION MODULE  (v2 — Enhanced)
// ============================================================
// Implements OLS polynomial regression with:
//   • k-fold Cross-Validation for automatic degree selection
//   • Residual standard deviation for confidence intervals
//   • predictWithCI() for upper/lower prediction bands
// ============================================================

class PolynomialRegression {
  /**
   * @param {number} degree – polynomial degree (1 = linear, 2 = quadratic …)
   */
  constructor(degree = 3) {
    this.degree = degree;
    this.coefficients = [];
    this._residualStd = 0;  // populated after fit()
  }

  // ============================================================
  // Linear-algebra helpers (Gauss-Jordan elimination)
  // ============================================================

  /** Build the Vandermonde design matrix for xs at the given degree */
  _vandermonde(xs, deg) {
    const d = deg !== undefined ? deg : this.degree;
    return xs.map(x => {
      const row = [];
      for (let p = 0; p <= d; p++) row.push(Math.pow(x, p));
      return row;
    });
  }

  /** Transpose matrix */
  _transpose(M) {
    const rows = M.length, cols = M[0].length;
    const T = Array.from({ length: cols }, () => new Array(rows));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) T[j][i] = M[i][j];
    return T;
  }

  /** Multiply two matrices */
  _multiply(A, B) {
    const rA = A.length, cA = A[0].length, cB = B[0].length;
    const C = Array.from({ length: rA }, () => new Array(cB).fill(0));
    for (let i = 0; i < rA; i++)
      for (let j = 0; j < cB; j++)
        for (let k = 0; k < cA; k++) C[i][j] += A[i][k] * B[k][j];
    return C;
  }

  /** Multiply matrix by column vector */
  _multiplyVec(A, v) {
    return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
  }

  /** Gauss-Jordan inverse of a square matrix */
  _invert(M) {
    const n = M.length;
    const aug = M.map((row, i) => {
      const id = new Array(n).fill(0);
      id[i] = 1;
      return [...row, ...id];
    });

    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++)
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) throw new Error('Singular matrix — reduce polynomial degree');
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map(row => row.slice(n));
  }

  // ============================================================
  // Core OLS fitting — for a given degree and data
  // ============================================================
  _fitRaw(xs, ys, deg) {
    const X = this._vandermonde(xs, deg);
    const Xt = this._transpose(X);
    const XtX = this._multiply(Xt, X);
    const XtX_inv = this._invert(XtX);
    const Xty = this._multiplyVec(Xt, ys);
    return this._multiplyVec(XtX_inv, Xty);  // coefficients array
  }

  _predictRaw(coeffs, x) {
    return coeffs.reduce((sum, c, p) => sum + c * Math.pow(x, p), 0);
  }

  _mseFold(coeffs, xs, ys) {
    return ys.reduce((acc, y, i) => acc + Math.pow(y - this._predictRaw(coeffs, xs[i]), 2), 0) / ys.length;
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Fit polynomial: y ≈ c0 + c1·x + c2·x² + … + cn·x^n
   * Also computes residual standard deviation for confidence intervals.
   */
  fit(xs, ys) {
    this.coefficients = this._fitRaw(xs, ys, this.degree);
    // Residual std dev: σ = √( Σ(yi - ŷi)² / (n - degree - 1) )
    const n = xs.length;
    const dof = Math.max(1, n - this.degree - 1);
    const ssRes = xs.reduce((s, x, i) => s + Math.pow(ys[i] - this._predictRaw(this.coefficients, x), 2), 0);
    this._residualStd = Math.sqrt(ssRes / dof);
    return this;
  }

  /**
   * Predict y for a single x value.
   */
  predict(x) {
    return this.coefficients.reduce((sum, c, p) => sum + c * Math.pow(x, p), 0);
  }

  /**
   * Predict for an array of x values.
   */
  predictMany(xs) {
    return xs.map(x => this.predict(x));
  }

  /**
   * Predict with a confidence / prediction interval.
   * Returns { pred, lower, upper } where the band is ±zScore·σ.
   * Default zScore = 1.96 → 95% interval.
   */
  predictWithCI(x, zScore = 1.96) {
    const pred = this.predict(x);
    const margin = zScore * this._residualStd;
    return { pred, lower: pred - margin, upper: pred + margin };
  }

  /**
   * R² (coefficient of determination)
   */
  r2(xs, ys) {
    const preds = this.predictMany(xs);
    const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
    const ssTot = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
    return 1 - ssRes / ssTot;
  }

  /**
   * Cross-Validation: k-fold CV over degrees 1..maxDegree.
   * Returns the degree with the lowest average validation MSE.
   *
   * @param {number[]} xs
   * @param {number[]} ys
   * @param {number}   maxDegree  – highest degree to try (default 6)
   * @param {number}   k          – number of folds (default 5)
   * @returns {{ bestDegree: number, scores: Array<{degree, mse}> }}
   */
  static crossValidate(xs, ys, maxDegree = 6, k = 5) {
    const n = xs.length;
    const foldSize = Math.floor(n / k);
    const scores = [];

    for (let deg = 1; deg <= maxDegree; deg++) {
      // Skip if we don't have enough points for this degree
      const minPoints = deg + 2;
      if (foldSize < minPoints || n - foldSize < minPoints) {
        scores.push({ degree: deg, mse: Infinity });
        continue;
      }

      let totalMse = 0;
      const dummy = new PolynomialRegression(deg);

      for (let fold = 0; fold < k; fold++) {
        const valStart = fold * foldSize;
        const valEnd   = valStart + foldSize;

        const trainXs = [], trainYs = [], valXs = [], valYs = [];
        for (let i = 0; i < n; i++) {
          if (i >= valStart && i < valEnd) { valXs.push(xs[i]); valYs.push(ys[i]); }
          else                             { trainXs.push(xs[i]); trainYs.push(ys[i]); }
        }

        try {
          const coeffs = dummy._fitRaw(trainXs, trainYs, deg);
          totalMse += dummy._mseFold(coeffs, valXs, valYs);
        } catch {
          totalMse += Infinity;
        }
      }
      scores.push({ degree: deg, mse: totalMse / k });
    }

    // Pick degree with minimum finite MSE
    const best = scores.reduce((best, s) => (s.mse < best.mse ? s : best), { degree: 2, mse: Infinity });
    return { bestDegree: best.degree, scores };
  }

  /** Return human-readable equation string */
  equationString() {
    return this.coefficients
      .map((c, p) => {
        const coef = c.toFixed(3);
        if (p === 0) return coef;
        if (p === 1) return `${coef}·x`;
        return `${coef}·x^${p}`;
      })
      .join(' + ');
  }
}