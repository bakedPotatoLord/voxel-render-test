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
const mapSize = new THREE.Vector3(128,32,128)
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
  tool.position = toolPath.at(toolI)
}

let paused = false

export function pause(){
  paused = true;
} 

export function unpause(){
  paused = false;
}

export function step(){
  if(paused){
    stepTool()
    updateChunks()
  }
}

export function stepBack(){
  if(paused){
    stepTool()
    updateChunks()
  }
}

function updateChunks(){
  


  
  tool.position = toolPath[toolI]
  
  let chunks = map.getIntersectingChunks(tool.box)
  
  // get the tool intersection boxes in world space all at once
  let chunkIntersects = tool.makeChunkIntersects(chunks)
  
  if(paused){
    console.log(chunkIntersects)
    console.log(JSON.parse(JSON.stringify(chunks)))
  }
  
  for(let {intersect,chunk} of chunkIntersects){
    chunk.booleanWithTool(tool,intersect)
    chunk.mesh()
  }


  if(paused){
    console.log(JSON.parse(JSON.stringify(chunks)))
  }
}


export async function setup(scene, camera, renderer) {
  
  let chunksObj = new THREE.Object3D({}) 
  chunksObj.add(...meshes)
  scene.add(chunksObj)
  scene.add(toolMesh)
  
  

  
}

export function draw(scene, camera, renderer) {
  if(!paused){
    stepTool()
    updateChunks()
  }
}