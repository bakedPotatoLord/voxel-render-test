import { Vector3 } from "three";
import testGcode from "./assets/test-gcode.nc?raw";

const MM_PER_INCH = 25.4;

/**
 * Parse a `; tool#=...` Kiri:Moto comment line into tool metadata (normalized to mm).
 *
 * @param {string} comment
 * @param {number} line
 */
function parseToolComment(comment, line) {
  const props = {};
  for (const match of comment.matchAll(/([A-Za-z#]+)=([^\s]+)/g)) {
    props[match[1].toLowerCase()] = match[2];
  }

  const toolNumber = Number(props["tool#"]);
  if (!Number.isFinite(toolNumber)) return null;

  const unit = (props.unit || "metric").toLowerCase();
  const scale = unit === "imperial" ? MM_PER_INCH : 1;

  const flute = props.flute !== undefined ? Number(props.flute) : NaN;
  const len = props.len !== undefined ? Number(props.len) : NaN;
  const shaft = props.shaft !== undefined ? Number(props.shaft) : NaN;

  return {
    toolNumber,
    fluteDiameter: Number.isFinite(flute) ? flute * scale : null,
    length: Number.isFinite(len) ? len * scale : null,
    ...(Number.isFinite(shaft) ? { shaftDiameter: shaft * scale } : {}),
    unit,
    line,
  };
}

/**
 * Linearize a G2 (CW) or G3 (CCW) XY-plane helical/planar arc into move entries.
 */
function buildArcMoves({
  code,
  from,
  to,
  iOffset,
  jOffset,
  feedRate,
  spindleSpeed,
  line,
  arcTolerance = 0.15,
}) {
  const centerX = from.x + iOffset;
  const centerY = from.y + jOffset;
  const radius = Math.hypot(from.x - centerX, from.y - centerY);

  if (radius < 1e-9) {
    return [
      {
        type: "move",
        code,
        rapid: false,
        from: from.clone(),
        to: to.clone(),
        feedRate,
        spindleSpeed,
        line,
      },
    ];
  }

  const startAngle = Math.atan2(from.y - centerY, from.x - centerX);
  const endAngle = Math.atan2(to.y - centerY, to.x - centerX);
  const endRadius = Math.hypot(to.x - centerX, to.y - centerY);

  let sweep = endAngle - startAngle;
  if (code === "G2") {
    if (sweep >= -1e-9) sweep -= Math.PI * 2;
  } else {
    if (sweep <= 1e-9) sweep += Math.PI * 2;
  }

  const maxStepAngle =
    radius > arcTolerance
      ? Math.max(0.05, 2 * Math.acos(Math.max(-1, 1 - arcTolerance / radius)))
      : Math.PI / 18;
  const segments = Math.max(1, Math.ceil(Math.abs(sweep) / maxStepAngle));

  const moves = [];
  let prev = from.clone();

  for (let s = 1; s <= segments; s++) {
    const t = s / segments;
    let next;
    if (s === segments) {
      next = to.clone();
    } else {
      const angle = startAngle + sweep * t;
      const r = radius + (endRadius - radius) * t;
      next = new Vector3(
        centerX + Math.cos(angle) * r,
        centerY + Math.sin(angle) * r,
        from.z + (to.z - from.z) * t
      );
    }

    moves.push({
      type: "move",
      code,
      rapid: false,
      from: prev,
      to: next,
      feedRate,
      spindleSpeed,
      line,
    });
    prev = next.clone();
  }

  return moves;
}

/**
 * Convert a Kiri:Moto G-code string (defaulting to `src/assets/test-gcode.nc`)
 * into an ordered list of movements and toolchanges in millimeters (G-code Z-up),
 * and extract the stock dimensions and work zero from the comments.
 *
 * `zero` is the position of G-code `(0, 0, 0)` in millimeters relative to the
 * stock's minimum corner `(0, 0, 0)` (so `stockPos = gcodePos.clone().add(zero)`).
 *
 * @param {string} [gcode=testGcode]
 */
export function parseGcode(gcode = testGcode) {
  const lines = gcode.split(/\r?\n/);

  let explicitStock = null;
  const processParams = {};
  const tools = {};
  let firstDefinedTool = null;

  const commands = [];

  // Modal machine state (normalized to mm and G-code Z-up axes)
  let unitScale = 1; // G21 = 1 (mm), G20 = 25.4 (in -> mm)
  let absoluteMode = true; // G90 = true, G91 = false
  let motionCode = "G0"; // Modal G0 / G1 / G2 / G3
  let feedRate = null; // mm/min
  let spindleSpeed = 0; // RPM (0 when off)
  let lastRpm = 0;
  let spindleOn = false;
  let selectedToolNumber = null;
  let hasActiveTool = false;

  const currentPos = new Vector3(0, 0, 0);

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNumber = idx + 1;
    const rawLine = lines[idx].trim();
    if (!rawLine) continue;

    // Split inline `;` comment from code portion
    const semiIdx = rawLine.indexOf(";");
    const codePart = (semiIdx >= 0 ? rawLine.slice(0, semiIdx) : rawLine)
      .replace(/\([^)]*\)/g, " ")
      .trim();
    const commentPart = semiIdx >= 0 ? rawLine.slice(semiIdx + 1).trim() : null;

    // Parse full-line metadata comments
    if (!codePart && commentPart) {
      const stockMatch = commentPart.match(
        /^Stock\s+X:([+-]?(?:\d+\.?\d*|\.\d+))\s+Y:([+-]?(?:\d+\.?\d*|\.\d+))\s+Z:([+-]?(?:\d+\.?\d*|\.\d+))/i
      );
      if (stockMatch) {
        explicitStock = new Vector3(
          Number(stockMatch[1]),
          Number(stockMatch[2]),
          Number(stockMatch[3])
        );
        continue;
      }

      if (commentPart.startsWith("tool#=")) {
        const toolInfo = parseToolComment(commentPart, lineNumber);
        if (toolInfo) {
          tools[toolInfo.toolNumber] = toolInfo;
          if (!firstDefinedTool) firstDefinedTool = toolInfo;
        }
        continue;
      }

      const kvMatch = commentPart.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (kvMatch) {
        processParams[kvMatch[1]] = kvMatch[2].trim();
      }
      continue;
    }

    if (!codePart) continue;

    // Parse G-code words on this line
    let lineMotion = null;
    let isToolChange = false;
    let hasF = false,
      hasX = false,
      hasY = false,
      hasZ = false;
    let fRaw = 0,
      xRaw = 0,
      yRaw = 0,
      zRaw = 0,
      iRaw = 0,
      jRaw = 0;

    for (const match of codePart.matchAll(
      /([A-Za-z])([+-]?(?:\d+\.?\d*|\.\d+))/g
    )) {
      const letter = match[1].toUpperCase();
      const value = Number(match[2]);

      switch (letter) {
        case "G":
          if (value === 0) lineMotion = "G0";
          else if (value === 1) lineMotion = "G1";
          else if (value === 2) lineMotion = "G2";
          else if (value === 3) lineMotion = "G3";
          else if (value === 20) unitScale = MM_PER_INCH;
          else if (value === 21) unitScale = 1;
          else if (value === 90) absoluteMode = true;
          else if (value === 91) absoluteMode = false;
          break;

        case "M":
          if (value === 3 || value === 4) {
            spindleOn = true;
            if (lastRpm > 0) spindleSpeed = lastRpm;
          } else if (value === 5) {
            spindleOn = false;
            spindleSpeed = 0;
          } else if (value === 6) {
            isToolChange = true;
          }
          break;

        case "T":
          selectedToolNumber = value;
          break;

        case "S":
          lastRpm = value;
          if (spindleOn) spindleSpeed = value;
          break;

        case "F":
          hasF = true;
          fRaw = value;
          break;

        case "X":
          hasX = true;
          xRaw = value;
          break;

        case "Y":
          hasY = true;
          yRaw = value;
          break;

        case "Z":
          hasZ = true;
          zRaw = value;
          break;

        case "I":
          iRaw = value;
          break;

        case "J":
          jRaw = value;
          break;
      }
    }

    if (hasF) {
      feedRate = fRaw * unitScale;
    }

    const xVal = xRaw * unitScale;
    const yVal = yRaw * unitScale;
    const zVal = zRaw * unitScale;
    const iVal = iRaw * unitScale;
    const jVal = jRaw * unitScale;

    if (lineMotion) {
      motionCode = lineMotion;
    }

    if (isToolChange) {
      const toolMeta =
        selectedToolNumber !== null ? tools[selectedToolNumber] : null;
      let name = null;
      if (commentPart) {
        const quotedMatch = commentPart.match(
          /change tool to\s+['"]([^'"]+)['"]/i
        );
        name = quotedMatch ? quotedMatch[1] : commentPart;
      }

      commands.push({
        type: "toolchange",
        toolNumber: selectedToolNumber,
        name,
        fluteDiameter: toolMeta ? toolMeta.fluteDiameter : null,
        length: toolMeta ? toolMeta.length : null,
        implicit: false,
        line: lineNumber,
      });
      hasActiveTool = true;
    }

    if (hasX || hasY || hasZ) {
      // When camToolInit is false, Kiri:Moto omits M6 before the first operation.
      // Emit the declared header tool so consumers have an active tool from move 0.
      if (!hasActiveTool && firstDefinedTool) {
        commands.push({
          type: "toolchange",
          toolNumber: firstDefinedTool.toolNumber,
          name: null,
          fluteDiameter: firstDefinedTool.fluteDiameter,
          length: firstDefinedTool.length,
          implicit: true,
          line: firstDefinedTool.line,
        });
        selectedToolNumber = firstDefinedTool.toolNumber;
        hasActiveTool = true;
      }

      const nextPos = currentPos.clone();
      if (hasX) nextPos.x = absoluteMode ? xVal : currentPos.x + xVal;
      if (hasY) nextPos.y = absoluteMode ? yVal : currentPos.y + yVal;
      if (hasZ) nextPos.z = absoluteMode ? zVal : currentPos.z + zVal;

      if (motionCode === "G2" || motionCode === "G3") {
        const arcTolerance =
          processParams.camArcTolerance !== undefined
            ? Number(processParams.camArcTolerance)
            : 0.15;
        commands.push(
          ...buildArcMoves({
            code: motionCode,
            from: currentPos,
            to: nextPos,
            iOffset: iVal,
            jOffset: jVal,
            feedRate,
            spindleSpeed,
            line: lineNumber,
            arcTolerance:
              Number.isFinite(arcTolerance) && arcTolerance > 0
                ? arcTolerance
                : 0.15,
          })
        );
      } else {
        commands.push({
          type: "move",
          code: motionCode,
          rapid: motionCode === "G0",
          from: currentPos.clone(),
          to: nextPos.clone(),
          feedRate,
          spindleSpeed,
          line: lineNumber,
        });
      }

      currentPos.copy(nextPos);
    }
  }

  // Resolve stock dimensions (mm)
  let stock = explicitStock;
  if (!stock && processParams.camStockOffset === "false") {
    stock = new Vector3(
      Number(processParams.camStockX) || 0,
      Number(processParams.camStockY) || 0,
      Number(processParams.camStockZ) || 0
    );
  }
  if (!stock) {
    stock = new Vector3(0, 0, 0);
  }

  // Resolve work zero (mm) relative to stock min corner (0, 0, 0)
  const originCenter = processParams.camOriginCenter === "true";
  const originTop = processParams.camOriginTop === "true";
  const offX = Number(processParams.camOriginOffX) || 0;
  const offY = Number(processParams.camOriginOffY) || 0;
  const offZ = Number(processParams.camOriginOffZ) || 0;

  const zero = new Vector3(
    (originCenter ? stock.x / 2 : 0) + offX,
    (originCenter ? stock.y / 2 : 0) + offY,
    (originTop ? stock.z : 0) + offZ
  );

  return {
    stock,
    zero,
    commands,
    tools,
  };
}

export default parseGcode;
