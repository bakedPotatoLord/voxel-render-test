import { Tool } from "../Tool";

export class VBit extends Tool {
  /**
   * @param {object} [options]
   * @param {number} [options.angle=90] - Included V-angle in degrees (0 < angle < 180)
   * @param {number} [options.tipRadius=0] - Flat engraving tip radius (0 for sharp point)
   * @param {number} [options.tipDiameter] - Flat engraving tip diameter
   * @param {number} [options.fluteRadius] - Maximum cutting flute radius (default 5 unless derived from fluteLength)
   * @param {number} [options.radius] - Alias for fluteRadius
   * @param {number} [options.fluteDiameter] - Maximum cutting flute diameter
   * @param {number} [options.diameter] - Alias for fluteDiameter
   * @param {number} [options.fluteLength] - Cutting length (defaults to coneHeight)
   * @param {number} [options.shaftRadius] - Shank radius (defaults to radius at top of flute)
   * @param {number} [options.shaftDiameter] - Shank diameter
   * @param {number} [options.shaftLength=15] - Shank length above the flute
   * @param {number} [options.height] - Total tool height (alternative to shaftLength)
   */
  constructor(options = {}) {
    super();

    const angle = options.angle ?? 90;
    if (angle <= 0 || angle >= 180) {
      throw new RangeError("angle must be strictly between 0 and 180 degrees");
    }

    const halfAngleRad = ((angle / 2) * Math.PI) / 180;
    const tanHalfAngle = Math.tan(halfAngleRad);

    const tipRadius =
      options.tipRadius ??
      (options.tipDiameter !== undefined ? options.tipDiameter / 2 : 0);

    if (tipRadius < 0) {
      throw new RangeError("tipRadius must be non-negative");
    }

    const explicitFluteRadius =
      options.fluteRadius ??
      options.radius ??
      (options.fluteDiameter !== undefined ? options.fluteDiameter / 2 : undefined) ??
      (options.diameter !== undefined ? options.diameter / 2 : undefined);

    let fluteRadius;
    let coneHeight;
    let fluteLength;

    if (explicitFluteRadius !== undefined) {
      fluteRadius = explicitFluteRadius;
      if (fluteRadius <= 0 || tipRadius > fluteRadius) {
        throw new RangeError(
          "fluteRadius must be greater than 0 and greater than or equal to tipRadius"
        );
      }
      coneHeight = (fluteRadius - tipRadius) / tanHalfAngle;

      if (options.fluteLength !== undefined) {
        fluteLength = options.fluteLength;
      } else if (options.height !== undefined && options.shaftLength !== undefined) {
        fluteLength = Math.max(0, options.height - options.shaftLength);
      } else if (options.height !== undefined) {
        fluteLength = Math.min(coneHeight, options.height);
      } else {
        fluteLength = coneHeight;
      }
    } else if (options.fluteLength !== undefined) {
      fluteLength = options.fluteLength;
      if (fluteLength < 0) {
        throw new RangeError("fluteLength must be non-negative");
      }
      coneHeight = fluteLength;
      fluteRadius = tipRadius + fluteLength * tanHalfAngle;
      if (fluteRadius <= 0) {
        throw new RangeError("Computed fluteRadius must be greater than 0");
      }
    } else {
      fluteRadius = Math.max(5, tipRadius + 5);
      coneHeight = (fluteRadius - tipRadius) / tanHalfAngle;
      if (options.height !== undefined && options.shaftLength !== undefined) {
        fluteLength = Math.max(0, options.height - options.shaftLength);
      } else if (options.height !== undefined) {
        fluteLength = Math.min(coneHeight, options.height);
      } else {
        fluteLength = coneHeight;
      }
    }

    if (fluteLength < 0) {
      throw new RangeError("fluteLength must be non-negative");
    }
    if (options.height !== undefined && options.height < fluteLength) {
      throw new RangeError("height must be greater than or equal to fluteLength");
    }

    const fluteTopRadius = Math.min(fluteRadius, tipRadius + fluteLength * tanHalfAngle);

    const shaftRadius =
      options.shaftRadius ??
      (options.shaftDiameter !== undefined ? options.shaftDiameter / 2 : undefined) ??
      fluteTopRadius;

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

    this.angle = angle;
    this.tipRadius = tipRadius;
    this.fluteRadius = fluteRadius;
    this.coneHeight = coneHeight;
    this.fluteLength = fluteLength;
    this.shaftRadius = shaftRadius;
    this.shaftLength = shaftLength;
    this.height = height;
    this.maxRadius =
      shaftLength > 0 ? Math.max(fluteTopRadius, shaftRadius) : fluteTopRadius;

    const coneTop = Math.min(coneHeight, fluteLength);
    const breakpoints = [];
    if (coneTop > 0) {
      breakpoints.push(coneTop);
    }
    if (fluteLength > coneTop) {
      breakpoints.push(fluteLength);
    }
    if (shaftLength > 0 && Math.abs(shaftRadius - fluteTopRadius) > 1e-9) {
      breakpoints.push(fluteLength, fluteLength + 1e-6);
    }
    this.yBreakpoints = breakpoints;

    this.radiusFunc = (y) => {
      const clampedY = Math.max(0, Math.min(this.height, y));
      if (clampedY <= this.fluteLength) {
        return Math.min(this.fluteRadius, this.tipRadius + clampedY * tanHalfAngle);
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

    pushUnique(Math.min(this.coneHeight, this.fluteLength));
    pushUnique(this.fluteLength);
    const fluteTopRadius = this.radiusFunc(this.fluteLength);
    if (this.shaftLength > 0 && Math.abs(this.shaftRadius - fluteTopRadius) > 1e-9) {
      pushUnique(Math.min(this.height, this.fluteLength + 1e-5));
    }
    pushUnique(this.height);
    return steps;
  }
}

export default VBit;
