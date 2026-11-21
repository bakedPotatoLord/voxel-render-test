import { Tool } from "../Tool";

export class BallMill extends Tool {
  /**
   * @param {object} [options]
   * @param {number} [options.fluteRadius] - Ball/cutting flute radius (default 5)
   * @param {number} [options.radius] - Alias for fluteRadius
   * @param {number} [options.ballRadius] - Alias for fluteRadius
   * @param {number} [options.fluteDiameter] - Cutting flute diameter
   * @param {number} [options.diameter] - Alias for fluteDiameter
   * @param {number} [options.fluteLength] - Cutting flute length (default max(15, fluteRadius))
   * @param {number} [options.shaftRadius] - Shank radius (defaults to fluteRadius)
   * @param {number} [options.shaftDiameter] - Shank diameter
   * @param {number} [options.shaftLength=15] - Shank length above the flute
   * @param {number} [options.height] - Total tool height (alternative to shaftLength)
   */
  constructor(options = {}) {
    super();

    const fluteRadius =
      options.fluteRadius ??
      options.radius ??
      options.ballRadius ??
      (options.fluteDiameter !== undefined ? options.fluteDiameter / 2 : undefined) ??
      (options.diameter !== undefined ? options.diameter / 2 : undefined) ??
      5;

    if (fluteRadius <= 0) {
      throw new RangeError("fluteRadius must be greater than 0");
    }

    const defaultFluteLength = Math.max(15, fluteRadius);
    let fluteLength;
    if (options.fluteLength !== undefined) {
      fluteLength = options.fluteLength;
    } else if (options.height !== undefined && options.shaftLength !== undefined) {
      fluteLength = Math.max(0, options.height - options.shaftLength);
    } else if (options.height !== undefined) {
      fluteLength = Math.min(defaultFluteLength, options.height);
    } else {
      fluteLength = defaultFluteLength;
    }

    if (fluteLength < 0) {
      throw new RangeError("fluteLength must be non-negative");
    }
    if (options.height !== undefined && options.height < fluteLength) {
      throw new RangeError("height must be greater than or equal to fluteLength");
    }

    const shaftRadius =
      options.shaftRadius ??
      (options.shaftDiameter !== undefined ? options.shaftDiameter / 2 : undefined) ??
      fluteRadius;

    if (shaftRadius <= 0) {
      throw new RangeError("shaftRadius must be greater than 0");
    }

    let shaftLength;
    if (options.shaftLength !== undefined) {
      shaftLength = options.shaftLength;
    } else if (options.height !== undefined) {
      shaftLength = options.height - fluteLength;
    } else {
      shaftLength = 15;
    }

    if (shaftLength < 0) {
      throw new RangeError("shaftLength must be non-negative");
    }

    const height = fluteLength + shaftLength;
    if (height <= 0) {
      throw new RangeError("Total tool height must be greater than 0");
    }

    const fluteTopRadius =
      fluteLength >= fluteRadius
        ? fluteRadius
        : Math.sqrt(
            Math.max(0, fluteRadius * fluteRadius - (fluteRadius - fluteLength) ** 2)
          );

    this.fluteRadius = fluteRadius;
    this.fluteLength = fluteLength;
    this.shaftRadius = shaftRadius;
    this.shaftLength = shaftLength;
    this.height = height;
    this.maxRadius =
      shaftLength > 0 ? Math.max(fluteTopRadius, shaftRadius) : fluteTopRadius;

    const ballTop = Math.min(fluteRadius, fluteLength);
    const breakpoints = [];
    if (ballTop > 0) {
      breakpoints.push(ballTop);
    }
    if (shaftLength > 0 && shaftRadius !== fluteTopRadius) {
      breakpoints.push(fluteLength, fluteLength + 1e-6);
    }
    this.yBreakpoints = breakpoints;

    this.radiusFunc = (y) => {
      const clampedY = Math.max(0, Math.min(this.height, y));
      if (clampedY <= this.fluteLength) {
        if (clampedY < this.fluteRadius) {
          const dy = this.fluteRadius - clampedY;
          return Math.sqrt(Math.max(0, this.fluteRadius * this.fluteRadius - dy * dy));
        }
        return this.fluteRadius;
      }
      return this.shaftRadius;
    };
  }

  getMeshYSteps() {
    const steps = [0];
    const pushUnique = (val) => {
      if (val > steps[steps.length - 1] + 1e-9 && val <= this.height) {
        steps.push(val);
      }
    };

    const ballCapHeight = Math.min(this.fluteRadius, this.fluteLength);
    if (ballCapHeight > 0) {
      const maxTheta = Math.acos(
        Math.max(-1, Math.min(1, 1 - ballCapHeight / this.fluteRadius))
      );
      const arcSegs = 16;
      for (let k = 1; k <= arcSegs; k++) {
        const theta = (k / arcSegs) * maxTheta;
        pushUnique(this.fluteRadius * (1 - Math.cos(theta)));
      }
    }

    pushUnique(this.fluteLength);
    const fluteTopRadius = this.radiusFunc(this.fluteLength);
    if (this.shaftLength > 0 && Math.abs(this.shaftRadius - fluteTopRadius) > 1e-9) {
      pushUnique(Math.min(this.height, this.fluteLength + 1e-5));
    }
    pushUnique(this.height);
    return steps;
  }
}

export default BallMill;
