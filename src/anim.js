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

let toolIprev = 0
let toolI = 0

let pathlen = 64

let toolPath = new Array(pathlen).fill().map((_,i) => {
  return new THREE.Vector3(
    Math.cos(i * Math.PI * 2 / pathlen)*(mapSize.x/3.0101010)+(mapSize.x/2),
    mapSize.y-20,
    Math.sin(i * Math.PI * 2 / pathlen)*(mapSize.z/3.0101010)+(mapSize.z/2),
  )
})

cutTool(toolPath[toolI]).forEach(chunk => {
  chunk.mesh()
})

function stepTool(){
  toolIprev = toolI
  toolI = (toolI + 1) % pathlen
  tool.position = toolPath[toolI]
}

function unstepTool(){
  toolIprev = toolI
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

  if(paused){
    console.log(toolPath[toolIprev], toolPath[toolI])
  }

  let toMesh = cutPath(toolPath[toolIprev] ,toolPath[toolI])
  // toMesh.push(...cutTool(toolPath[toolI]))

  toMesh.forEach(chunk => {
    chunk.mesh()
  })
}

export function stepBack(){
  unstepTool()

  if(paused){
    console.log(toolPath[toolIprev], toolPath[toolI])
  }

  let toMesh = cutPath(toolPath[toolIprev] ,toolPath[toolI])
  // toMesh.push(...cutTool(toolPath[toolI]))

  toMesh.forEach(chunk => {
    chunk.mesh()
  })
}

function cutTool(position){
  tool.position = position
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
  const toMesh = [];
  
  // Use Tool's method to compute swept AABB
  const sweepBounds = tool.computeSweptAABB(start, end, map.fullSize);
  const { sweepMin, sweepMax } = sweepBounds;

  // Find chunk index ranges that the sweep box overlaps
  const cs = map.chunkSize;
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

  // Clamp to valid chunk indices
  minChunkIdx.x = Math.max(0, Math.min(minChunkIdx.x, map.numChunks.x - 1));
  minChunkIdx.y = Math.max(0, Math.min(minChunkIdx.y, map.numChunks.y - 1));
  minChunkIdx.z = Math.max(0, Math.min(minChunkIdx.z, map.numChunks.z - 1));
  maxChunkIdx.x = Math.max(0, Math.min(maxChunkIdx.x, map.numChunks.x - 1));
  maxChunkIdx.y = Math.max(0, Math.min(maxChunkIdx.y, map.numChunks.y - 1));
  maxChunkIdx.z = Math.max(0, Math.min(maxChunkIdx.z, map.numChunks.z - 1));

  // Process each candidate chunk using Chunk's method
  for (let cx = minChunkIdx.x; cx <= maxChunkIdx.x; cx++) {
    for (let cy = minChunkIdx.y; cy <= maxChunkIdx.y; cy++) {
      for (let cz = minChunkIdx.z; cz <= maxChunkIdx.z; cz++) {
        const chunk = map.getChunk(cx, cy, cz);
        if (!chunk) {
          throw new Error(`chunk not found at (${cx}, ${cy}, ${cz})`);
        };
        
        // Use Chunk's method to process swept tool cutting
        if (chunk.processSweptToolCut(tool, start, end, sweepBounds)) {
          toMesh.push(chunk);
        }
      }
    }
  }

  return toMesh;
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