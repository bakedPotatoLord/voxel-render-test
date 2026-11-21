import { describe, test, expect } from "bun:test";
import * as THREE from "three";
import { Tool } from "../src/Tool";
import Chunk from "../src/Chunk";
import { FlatEndMill, BullEndMill, BallMill, VBit } from "../src/tools";
import * as allTools from "../src/tools";

function assertValidMesh(tool) {
  const mat = new THREE.MeshBasicMaterial();
  const mesh = tool.toMesh(mat);
  expect(mesh).toBeInstanceOf(THREE.Mesh);

  const pos = mesh.geometry.getAttribute("position");
  const norm = mesh.geometry.getAttribute("normal");
  expect(pos.count).toBeGreaterThan(0);
  expect(norm.count).toBe(pos.count);

  for (let i = 0; i < pos.array.length; i++) {
    expect(Number.isNaN(pos.array[i])).toBe(false);
    expect(Number.isNaN(norm.array[i])).toBe(false);
  }
}

describe("Tool subclasses", () => {
  test("all tools extend Tool", () => {
    Object.values(allTools).forEach(tool => {
      expect(new tool()).toBeInstanceOf(Tool);
    })
  });

  test("FlatEndMill profile, options, and mesh", () => {
    const tool = new FlatEndMill({
      diameter: 12,
      fluteLength: 10,
      shaftDiameter: 8,
      shaftLength: 20,
    });

    expect(tool.fluteRadius).toBe(6);
    expect(tool.shaftRadius).toBe(4);
    expect(tool.height).toBe(30);
    expect(tool.maxRadius).toBe(6);

    expect(tool.radiusFunc(0)).toBe(6);
    expect(tool.radiusFunc(5)).toBe(6);
    expect(tool.radiusFunc(10)).toBe(6);
    expect(tool.radiusFunc(10.1)).toBe(4);
    expect(tool.radiusFunc(30)).toBe(4);
    expect(tool.radiusFunc(-1e-9)).toBe(6);

    assertValidMesh(tool);
  });

  test("BullEndMill profile, boundary reductions, and mesh", () => {
    const bull = new BullEndMill({
      fluteRadius: 6,
      cornerRadius: 2,
      fluteLength: 12,
      shaftRadius: 6,
      shaftLength: 10,
    });

    // At y = 0: flat bottom radius = 6 - 2 = 4
    expect(bull.radiusFunc(0)).toBeCloseTo(4, 9);
    // At y = 1: 4 + sqrt(4 - 1) = 4 + sqrt(3)
    expect(bull.radiusFunc(1)).toBeCloseTo(4 + Math.sqrt(3), 9);
    // At y = 2: full flute radius = 6
    expect(bull.radiusFunc(2)).toBeCloseTo(6, 9);
    expect(bull.radiusFunc(10)).toBe(6);
    expect(bull.radiusFunc(-1e-9)).toBeCloseTo(4, 9);

    // cornerRadius = 0 matches FlatEndMill
    const flatEquiv = new BullEndMill({ fluteRadius: 5, cornerRadius: 0 });
    expect(flatEquiv.radiusFunc(0)).toBe(5);
    expect(flatEquiv.radiusFunc(3)).toBe(5);

    // cornerRadius = fluteRadius matches BallMill
    const ballEquiv = new BullEndMill({ fluteRadius: 5, cornerRadius: 5 });
    const ball = new BallMill({ fluteRadius: 5 });
    for (const y of [0, 0.5, 2, 4.9, 5, 10]) {
      expect(ballEquiv.radiusFunc(y)).toBeCloseTo(ball.radiusFunc(y), 9);
    }

    assertValidMesh(bull);
    assertValidMesh(ballEquiv);
  });

  test("BallMill profile and mesh", () => {
    const ball = new BallMill({
      fluteRadius: 5,
      fluteLength: 15,
      shaftRadius: 8,
      shaftLength: 15,
    });

    expect(ball.maxRadius).toBe(8);
    expect(ball.radiusFunc(-1e-9)).toBe(0);
    expect(ball.radiusFunc(0)).toBe(0);
    // y = 2 -> sqrt(25 - 9) = 4
    expect(ball.radiusFunc(2)).toBeCloseTo(4, 9);
    expect(ball.radiusFunc(5)).toBeCloseTo(5, 9);
    expect(ball.radiusFunc(12)).toBe(5);
    expect(ball.radiusFunc(20)).toBe(8);

    assertValidMesh(ball);
  });

  test("VBit sharp, flat-tip, and angled profiles and mesh", () => {
    // 90 deg sharp V-bit: half-angle = 45 deg, tan = 1
    const v90 = new VBit({
      angle: 90,
      fluteRadius: 8,
      shaftRadius: 4,
      shaftLength: 12,
    });

    expect(v90.coneHeight).toBeCloseTo(8, 9);
    expect(v90.fluteLength).toBeCloseTo(8, 9);
    expect(v90.height).toBeCloseTo(20, 9);
    expect(v90.maxRadius).toBeCloseTo(8, 9);
    expect(v90.radiusFunc(-1e-9)).toBe(0);
    expect(v90.radiusFunc(0)).toBe(0);
    expect(v90.radiusFunc(3.5)).toBeCloseTo(3.5, 9);
    expect(v90.radiusFunc(8)).toBeCloseTo(8, 9);
    expect(v90.radiusFunc(9)).toBeCloseTo(4, 9);

    // 60 deg engraving V-bit with flat tip
    const v60 = new VBit({
      angle: 60,
      tipDiameter: 2, // tipRadius = 1
      diameter: 10, // fluteRadius = 5
    });
    const expectedConeH = 4 / Math.tan(Math.PI / 6);
    expect(v60.coneHeight).toBeCloseTo(expectedConeH, 9);
    expect(v60.radiusFunc(0)).toBeCloseTo(1, 9);
    expect(v60.radiusFunc(expectedConeH / 2)).toBeCloseTo(3, 9);
    expect(v60.radiusFunc(expectedConeH)).toBeCloseTo(5, 9);

    assertValidMesh(v90);
    assertValidMesh(v60);
  });

  test("parameter validation throws RangeError on invalid inputs", () => {
    expect(() => new FlatEndMill({ radius: 0 })).toThrow(RangeError);
    expect(() => new BullEndMill({ radius: 5, cornerRadius: 6 })).toThrow(RangeError);
    expect(() => new BullEndMill({ radius: 5, cornerRadius: -1 })).toThrow(RangeError);
    expect(() => new BallMill({ radius: -2 })).toThrow(RangeError);
    expect(() => new VBit({ angle: 0 })).toThrow(RangeError);
    expect(() => new VBit({ angle: 180 })).toThrow(RangeError);
    expect(() => new VBit({ tipRadius: 6, fluteRadius: 5 })).toThrow(RangeError);
  });

  test("swept path cutting shapes voxel cross-sections accurately", () => {
    const start = new THREE.Vector3(4, 8, 16);
    const end = new THREE.Vector3(28, 8, 16);

    const cutChunkWith = (tool) => {
      const chunk = new Chunk(new THREE.Vector3(32, 32, 32), new THREE.Vector3(0, 0, 0));
      chunk.fillVoxels(1);
      const bounds = tool.computeSweptAABB(start, end, new THREE.Vector3(32, 32, 32));
      const modified = chunk.processSweptToolCut(tool, start, end, bounds);
      expect(modified).toBe(true);
      return chunk;
    };

    const flatChunk = cutChunkWith(new FlatEndMill({ radius: 5, fluteLength: 20 }));
    const ballChunk = cutChunkWith(new BallMill({ radius: 5, fluteLength: 20 }));
    const vbitChunk = cutChunkWith(new VBit({ angle: 90, fluteRadius: 6, fluteLength: 6, shaftRadius: 6 }));

    // Center bottom of groove (x=16, y=8 -> localY=0.5, z=16 -> dz=0.5):
    // FlatEndMill(r=5) cuts wide at y=8 (z=12 -> dz=3.5 < 5 is cut)
    expect(flatChunk.getVoxel(16, 8, 12)).toBe(0);
    // BallMill(r=5) at localY=0.5 has r = sqrt(25 - 4.5^2) = sqrt(4.75) ≈ 2.18, so dz=3.5 is NOT cut!
    expect(ballChunk.getVoxel(16, 8, 12)).toBe(1);
    // Higher up at y=13 (localY=5.5, r=5), BallMill DOES cut dz=3.5:
    expect(ballChunk.getVoxel(16, 13, 12)).toBe(0);

    // VBit(90 deg) at y=9 (localY=1.5, r=1.5) cuts center (z=16, dz=0.5) but not z=13 (dz=2.5)
    expect(vbitChunk.getVoxel(16, 9, 16)).toBe(0);
    expect(vbitChunk.getVoxel(16, 9, 13)).toBe(1);
    // At y=12 (localY=4.5, r=4.5), VBit DOES cut z=13 (dz=2.5)
    expect(vbitChunk.getVoxel(16, 12, 13)).toBe(0);
  });
});
