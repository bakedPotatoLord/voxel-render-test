import { describe, expect, test } from "bun:test";
import { parseGcode } from "../src/gcode.js";

describe("parseGcode", () => {
  test("extracts stock dimensions, zero, tools, and ordered commands from test-gcode.nc", () => {
    const result = parseGcode();

    // Stock: ; Stock X:100 Y:50 Z:15
    expect(result.stock.x).toBe(100);
    expect(result.stock.y).toBe(50);
    expect(result.stock.z).toBe(15);

    // Zero: camOriginCenter = false, camOriginTop = true, offsets = 0 => (0, 0, 15)
    expect(result.zero.x).toBe(0);
    expect(result.zero.y).toBe(0);
    expect(result.zero.z).toBe(15);

    // Tool metadata from ; tool#=4 flute=0.125 len=2 unit=imperial (converted to mm)
    expect(result.tools[4]).toBeDefined();
    expect(result.tools[4].fluteDiameter).toBeCloseTo(3.175, 6);
    expect(result.tools[4].length).toBeCloseTo(50.8, 6);

    const toolChanges = result.commands.filter((c) => c.type === "toolchange");
    const moves = result.commands.filter((c) => c.type === "move");

    // 1 implicit initial toolchange (roughing op) + 1 explicit M6 T4 (helical op)
    expect(toolChanges).toHaveLength(2);
    expect(toolChanges[0]).toMatchObject({
      type: "toolchange",
      toolNumber: 4,
      implicit: true,
      line: 215,
    });
    expect(toolChanges[1]).toMatchObject({
      type: "toolchange",
      toolNumber: 4,
      name: "1 flute 1/8 End Mill",
      implicit: false,
      line: 4337,
    });

    // 34 G0 + 4510 G1 = 4544 moves
    expect(moves).toHaveLength(4544);
    expect(moves.filter((m) => m.rapid)).toHaveLength(34);
    expect(moves.filter((m) => !m.rapid)).toHaveLength(4510);

    // First command is the initial toolchange, followed by G0 moves
    expect(result.commands[0].type).toBe("toolchange");
    expect(result.commands[1].type).toBe("move");
    expect(result.commands[1].rapid).toBe(true);

    // Verify inch -> mm conversion on first cutting move (line 223: G1 Y1.9685 Z-0.0755 F11.6667)
    const firstCut = moves.find((m) => !m.rapid);
    expect(firstCut.line).toBe(223);
    expect(firstCut.from.x).toBeCloseTo(0, 4);
    expect(firstCut.from.y).toBeCloseTo(0, 4);
    expect(firstCut.from.z).toBeCloseTo(0.0996 * 25.4, 4);
    expect(firstCut.to.x).toBeCloseTo(0, 4);
    expect(firstCut.to.y).toBeCloseTo(50, 2);
    expect(firstCut.to.z).toBeCloseTo(-0.0755 * 25.4, 4);
    expect(firstCut.spindleSpeed).toBe(1000);

    // Verify all move coordinates mapped by +zero fall within stock XY bounds [0..100, 0..50]
    for (const move of moves) {
      const sx = move.to.x + result.zero.x;
      const sy = move.to.y + result.zero.y;
      expect(sx).toBeGreaterThanOrEqual(-1e-3);
      expect(sx).toBeLessThanOrEqual(result.stock.x + 1e-3);
      expect(sy).toBeGreaterThanOrEqual(-1e-3);
      expect(sy).toBeLessThanOrEqual(result.stock.y + 1e-3);
    }
  });

  test("handles centered origin, origin offsets, explicit initial M6, and G91 relative moves", () => {
    const sample = `
; Stock X:80 Y:40 Z:20
; camOriginCenter = true
; camOriginTop = false
; camOriginOffX = 5
; camOriginOffY = -2
; camOriginOffZ = 1
; --- tools ---
; tool#=2 flute=6 len=30 unit=metric
G21
G90
M6 T2 ; change tool to '6mm Flat'
M3 S12000
G0 X0 Y0 Z25 F3000
G1 Z10 F400
G91
G1 X10 Y-5
M5
M30
`;
    const res = parseGcode(sample);
    expect(res.stock.x).toBe(80);
    expect(res.stock.y).toBe(40);
    expect(res.stock.z).toBe(20);

    // Center XY (40, 20) + offsets (5, -2, 1) with bottom Z (0) => (45, 18, 1)
    expect(res.zero.x).toBe(45);
    expect(res.zero.y).toBe(18);
    expect(res.zero.z).toBe(1);

    // No duplicate implicit toolchange when M6 precedes moves
    expect(res.commands).toHaveLength(4);
    expect(res.commands[0]).toMatchObject({
      type: "toolchange",
      toolNumber: 2,
      name: "6mm Flat",
      fluteDiameter: 6,
      length: 30,
      implicit: false,
    });
    expect(res.commands[3].to.x).toBe(10);
    expect(res.commands[3].to.y).toBe(-5);
    expect(res.commands[3].to.z).toBe(10);
  });
});
