import VoxelMap from "./VoxelMap";
import * as THREE from "three";
import texture from "./assets/texture/oakMDF.png";
import Tool from "./Tool";
// import vertex from "./shaders/vertex.glsl" with {type: "x-shader/x-vertex"};
// import fragment from "./shaders/fragment.glsl" with {type: "x-shader/x-fragment"};


let textureLoader =  new THREE.TextureLoader()
let textureMap = await textureLoader.loadAsync(texture)
textureMap.matrix.setUvTransform(0, 0, 1, 1,0,1,1 );

const chunkSize = new THREE.Vector3(32,32,32)
const mapSize = new THREE.Vector3(256,32,256)
let map = new VoxelMap(chunkSize,mapSize)
let tool = new Tool()

let voxelMaterial = new THREE.MeshPhongMaterial({
  color:"#9c886a",
  side:THREE.DoubleSide,
})

let meshes = map.getObjects(voxelMaterial)

let toolMat = new THREE.MeshPhongMaterial({
  color:0x7d7d7d,
  side:THREE.FrontSide,
  transparent: true,
  opacity: 0.8
})

let toolMesh = tool.toMesh(toolMat)

let toolI = 0

let pathlen = 16

let toolPath = new Array(pathlen).fill().map((_,i) => {
  return new THREE.Vector3(
    Math.cos(i * Math.PI * 2 / pathlen)*(mapSize.x/3)+(mapSize.x/2),
    mapSize.y-20,
    Math.sin(i * Math.PI * 2 / pathlen)*(mapSize.z/3)+(mapSize.z/2),
  )
})

function stepTool(){
  toolI = (toolI + 1) % pathlen
  tool.position = toolPath[toolI]
}

function unstepTool(){
  toolI = (toolI - 1 + pathlen) % pathlen
  tool.position = toolPath[toolI]
}

let paused = true

export function pause(){
  paused = true;
} 

export function unpause(){
  paused = false;
}

export function step(){
  stepTool()
  let toMesh = cutPath(toolPath.at(toolI-1) ,toolPath.at(toolI))
  toMesh.push(...cutTool(toolPath.at(toolI)))


  let unique = new Set(toMesh)

  unique.forEach(chunk => {
    chunk.mesh()
  })
}

export function stepBack(){
  unstepTool()
}

function cutTool(position){
  
  let toolChunks = map.getIntersectingChunks(tool.box)
  
  // get the tool intersection boxes in world space all at once
  let chunkIntersects = tool.makeChunkIntersects(toolChunks)
  
  let toMesh = []

  for(let {intersect,chunk} of chunkIntersects){
    chunk.booleanWithTool(tool,intersect)
    toMesh.push(chunk)
  }

  return toMesh
}

function cutPath(start, end) {
  const eps = 1e-9;

  let toMesh = []
  
  // Precompute deltas
  const d = new THREE.Vector3().subVectors(end, start);
  const dx = d.x, dy = d.y, dz = d.z;

  // conservative swept AABB: union of tool boxes at start and end
  const startBox = new THREE.Box3(
    new THREE.Vector3(start.x - tool.maxRadius, start.y, start.z - tool.maxRadius),
    new THREE.Vector3(start.x + tool.maxRadius, start.y + tool.height, start.z + tool.maxRadius)
  );
  const endBox = new THREE.Box3(
    new THREE.Vector3(end.x - tool.maxRadius, end.y, end.z - tool.maxRadius),
    new THREE.Vector3(end.x + tool.maxRadius, end.y + tool.height, end.z + tool.maxRadius)
  );
  const sweepMin = new THREE.Vector3(
    Math.min(startBox.min.x, endBox.min.x),
    Math.min(startBox.min.y, endBox.min.y),
    Math.min(startBox.min.z, endBox.min.z)
  );
  const sweepMax = new THREE.Vector3(
    Math.max(startBox.max.x, endBox.max.x),
    Math.max(startBox.max.y, endBox.max.y),
    Math.max(startBox.max.z, endBox.max.z)
  );

  // clamp to map bounds
  sweepMin.x = Math.max(0, sweepMin.x);
  sweepMin.y = Math.max(0, sweepMin.y);
  sweepMin.z = Math.max(0, sweepMin.z);
  sweepMax.x = Math.min(map.fullSize.x, sweepMax.x);
  sweepMax.y = Math.min(map.fullSize.y, sweepMax.y);
  sweepMax.z = Math.min(map.fullSize.z, sweepMax.z);

  // Find chunk index ranges that the sweep box overlaps
  const cs = map.chunkSize; // Vector3
  const minChunkIdx = new THREE.Vector3(
    Math.floor(sweepMin.x / cs.x),
    Math.floor(sweepMin.y / cs.y),
    Math.floor(sweepMin.z / cs.z)
  );
  const maxChunkIdx = new THREE.Vector3(
    Math.floor((sweepMax.x - eps) / cs.x),
    Math.floor((sweepMax.y - eps) / cs.y),
    Math.floor((sweepMax.z - eps) / cs.z)
  );

  // clamp to valid chunk indices
  minChunkIdx.x = Math.max(0, Math.min(minChunkIdx.x, map.numChunks.x - 1));
  minChunkIdx.y = Math.max(0, Math.min(minChunkIdx.y, map.numChunks.y - 1));
  minChunkIdx.z = Math.max(0, Math.min(minChunkIdx.z, map.numChunks.z - 1));
  maxChunkIdx.x = Math.max(0, Math.min(maxChunkIdx.x, map.numChunks.x - 1));
  maxChunkIdx.y = Math.max(0, Math.min(maxChunkIdx.y, map.numChunks.y - 1));
  maxChunkIdx.z = Math.max(0, Math.min(maxChunkIdx.z, map.numChunks.z - 1));

  // Helper: convert chunk indices to single index used in map.chunks
  function chunkIndex(cx, cy, cz) {
    return cx + cy * map.numChunks.x + cz * map.numChunks.y * map.numChunks.x;
  }

  // For speed: precompute integer localY breakpoints [0..height] (we'll split t-intervals at those)
  const height = tool.height | 0;
  const localYBreaks = [];
  for (let yy = 0; yy <= height; yy++) localYBreaks.push(yy);

  // For each candidate chunk, iterate its voxels and test membership in swept solid
  for (let cx = minChunkIdx.x; cx <= maxChunkIdx.x; cx++) {
    for (let cy = minChunkIdx.y; cy <= maxChunkIdx.y; cy++) {
      for (let cz = minChunkIdx.z; cz <= maxChunkIdx.z; cz++) {
        const idx = chunkIndex(cx, cy, cz);
        const chunk = map.chunks[idx];
        console.log(chunk)
        if (!chunk) continue;

        // chunk world origin and size
        const chunkOrigin = chunk.position.clone(); // already pos * size
        const w = chunk.width, h = chunk.height, dpth = chunk.depth;

        // quick AABB intersection: chunk.box intersects sweep box?
        if (!chunk.box.intersectsBox(new THREE.Box3(sweepMin.clone(), sweepMax.clone()))) {
          continue;
        }

        // Iterate voxels within chunk bounds (we restrict to intersection with sweepMin/sweepMax)
        const vminX = Math.max(0, Math.floor(sweepMin.x - chunkOrigin.x));
        const vmaxX = Math.min(w - 1, Math.floor(sweepMax.x - chunkOrigin.x));
        const vminY = Math.max(0, Math.floor(sweepMin.y - chunkOrigin.y));
        const vmaxY = Math.min(h - 1, Math.floor(sweepMax.y - chunkOrigin.y));
        const vminZ = Math.max(0, Math.floor(sweepMin.z - chunkOrigin.z));
        const vmaxZ = Math.min(dpth - 1, Math.floor(sweepMax.z - chunkOrigin.z));

        for (let vx = vminX; vx <= vmaxX; vx++) {
          for (let vy = vminY; vy <= vmaxY; vy++) {
            for (let vz = vminZ; vz <= vmaxZ; vz++) {
              // Global voxel center coordinates (use center at +0.5)
              const P = {
                x: chunkOrigin.x + vx + 0.5,
                y: chunkOrigin.y + vy + 0.5,
                z: chunkOrigin.z + vz + 0.5
              };

              // --- Determine t-interval where voxel's localY is inside [0, tool.height] ---
              // localY(t) = P.y - (start.y + t*dy)  => condition 0 <= localY(t) <= height
              // => 0 <= P.y - start.y - t*dy <= height
              // Solve for t: when dy != 0, t in [(P.y - start.y - height)/dy, (P.y - start.y)/dy] (order depends on sign of dy)
              let tLo = 0, tHi = 1;
              if (Math.abs(dy) < 1e-12) {
                // dy == 0: localY is constant; check if that constant is in range
                const localYConst = P.y - start.y;
                if (localYConst < 0 || localYConst > height) {
                  continue; // voxel never vertically covered
                } // otherwise t interval is whole [0,1]
              } else {
                const t1 = (P.y - start.y - height) / dy;
                const t2 = (P.y - start.y) / dy;
                // interval is between min/max of t1,t2
                const ta = Math.min(t1, t2);
                const tb = Math.max(t1, t2);
                tLo = Math.max(0, ta);
                tHi = Math.min(1, tb);
                if (tHi < tLo) continue; // no intersection in [0,1]
              }

              // Now we have a t-interval [tLo, tHi] where vertical alignment is OK.
              // Split this interval at t-values that correspond to integer localY boundaries
              const tBreaks = [tLo, tHi];
              // For each integer yBreak in [0..height], compute t s.t. localY(t) = yBreak
              // localY(t) = P.y - (start.y + t*dy) = yBreak => t = (P.y - start.y - yBreak)/dy
              if (Math.abs(dy) > 1e-12) {
                for (let yBreak = 0; yBreak <= height; yBreak++) {
                  const tAtY = (P.y - start.y - yBreak) / dy;
                  if (tAtY > tLo + 1e-12 && tAtY < tHi - 1e-12) {
                    tBreaks.push(tAtY);
                  }
                }
              }
              // sort and unique
              tBreaks.sort((a, b) => a - b);
              const cleaned = [];
              for (let val of tBreaks) {
                if (cleaned.length === 0 || Math.abs(val - cleaned[cleaned.length - 1]) > 1e-9) cleaned.push(val);
              }

              // Quadratic coefficients for horizontal squared distance:
              // Dist^2(t) = (P.x - (start.x + t*dx))^2 + (P.z - (start.z + t*dz))^2
              // = (dx^2 + dz^2) * t^2 + 2 * ((start.x - P.x)*dx + (start.z - P.z)*dz) * t + (P.x - start.x)^2 + (P.z - start.z)^2
              const A = dx * dx + dz * dz;
              const B = 2 * ((start.x - P.x) * dx + (start.z - P.z) * dz);
              const C = (P.x - start.x) * (P.x - start.x) + (P.z - start.z) * (P.z - start.z);

              let voxelCut = false;

              // iterate subintervals
              for (let bi = 0; bi < cleaned.length - 1 && !voxelCut; bi++) {
                const ta = cleaned[bi];
                const tb = cleaned[bi + 1];
                if (tb <= ta) continue;

                // Determine a conservative r_max on [ta,tb]
                // Compute localY at endpoints and maybe midpoint
                const localYa = P.y - (start.y + ta * dy);
                const localYb = P.y - (start.y + tb * dy);
                const localYm = P.y - (start.y + ((ta + tb) * 0.5) * dy);
                // radius is function tool.radiusFunc(localY)
                const ra = tool.radiusFunc(localYa);
                const rb = tool.radiusFunc(localYb);
                const rm = tool.radiusFunc(localYm);
                const rMax = Math.max(ra, rb, rm);

                // We need to check if there exists t in [ta,tb] with Dist^2(t) <= r(t)^2.
                // Conservative test: check Dist^2(t) - rMax^2 <= 0 for some t in [ta,tb].
                // define g(t) = Dist^2(t) - rMax^2 = A t^2 + B t + (C - rMax^2)
                const Cprime = C - rMax * rMax;

                // If A is ~0 (tool center motion in XZ is degenerate), handle linear or constant
                if (Math.abs(A) < 1e-12) {
                  // g(t) = B t + C'
                  const gta = B * ta + Cprime;
                  const gtb = B * tb + Cprime;
                  if (gta <= 0 || gtb <= 0 || (gta > 0 && gtb < 0) || (gta < 0 && gtb > 0)) {
                    voxelCut = (Math.min(gta, gtb) <= 0);
                  }
                } else {
                  // Quadratic: minimum at t* = -B/(2A)
                  const tStar = -B / (2 * A);
                  const evalAt = (t) => A * t * t + B * t + Cprime;
                  const gta = evalAt(ta);
                  const gtb = evalAt(tb);
                  let gmin = Math.min(gta, gtb);
                  if (tStar >= ta && tStar <= tb) {
                    const gst = evalAt(tStar);
                    gmin = Math.min(gmin, gst);
                  }
                  if (gmin <= 0) voxelCut = true;
                }
              } // end subintervals loop

              if (voxelCut) {
                // set voxel to 0 in chunk local coords
                chunk.setVoxel(vx, vy, vz, 0);
              }
            }
          }
        }

        // Optionally mark the chunk to be re-meshed later or re-mesh now:
        // map.toUpdate.push(chunk); // if you plan to batch updates later
        // or update immediately: 
        // 
        toMesh.push(chunk)  
        // chunk.mesh()
      }
    }
  }

  return toMesh
}


export async function setup(scene, camera, renderer) {
  
  let chunksObj = new THREE.Object3D({}) 
  chunksObj.add(...meshes)
  scene.add(chunksObj)
  scene.add(toolMesh)
  
  
  // cutTool(toolPath[toolI])
  
}

export function draw(scene, camera, renderer) {
  if(!paused){
    
    if(toolI >= pathlen){
      pause()
      return
    }
    step()  
  }
}