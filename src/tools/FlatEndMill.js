import { Tool } from "../Tool";

export class FlatEndMill extends Tool {
  /**
   * @param {object} [options]
   * @param {number} [options.fluteRadius] - Cutting flute radius (default 5)
   * @param {number} [options.radius] - Alias for fluteRadius
   * @param {number} [options.fluteDiameter] - Cutting flute diameter
   * @param {number} [options.diameter] - Alias for fluteDiameter
   * @param {number} [options.fluteLength=15] - Cutting flute length
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
      (options.fluteDiameter !== undefined ? options.fluteDiameter / 2 : undefined) ??
      (options.diameter !== undefined ? options.diameter / 2 : undefined) ??
      5;

    if (fluteRadius <= 0) {
      throw new RangeError("fluteRadius must be greater than 0");
    }

    const defaultFluteLength = 15;
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

    this.fluteRadius = fluteRadius;
    this.fluteLength = fluteLength;
    this.shaftRadius = shaftRadius;
    this.shaftLength = shaftLength;
    this.height = height;
    this.maxRadius = shaftLength > 0 ? Math.max(fluteRadius, shaftRadius) : fluteRadius;

    const hasStep = shaftLength > 0 && shaftRadius !== fluteRadius;
    this.yBreakpoints = hasStep ? [fluteLength, fluteLength + 1e-6] : [];

    this.radiusFunc = (y) => {
      const clampedY = Math.max(0, Math.min(this.height, y));
      if (clampedY <= this.fluteLength) {
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

    pushUnique(this.fluteLength);
    if (this.shaftLength > 0 && this.shaftRadius !== this.fluteRadius) {
      pushUnique(Math.min(this.height, this.fluteLength + 1e-5));
    }
    pushUnique(this.height);
    return steps;
  }
}

export default FlatEndMill;
