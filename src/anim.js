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
const mapSize = new THREE.Vector3(128,128,128)
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

let toolPath = new Array(128).fill().map((_,i) => {
  return new THREE.Vector3(
    Math.cos(i * Math.PI * 2 / 128)*(mapSize.x/3)+(mapSize.x/2),
    mapSize.y-20,
    Math.sin(i * Math.PI * 2 / 128)*(mapSize.z/3)+(mapSize.z/2),
  )
})

let paused = false

export function pause(){
  paused = true;
} 

export function unpause(){
  paused = false;
}

export function step(){
  if(paused){
    toolI = (toolI + 1) % 128
    tool.setPos(toolPath.at(toolI))
    updateChunks()
  }
}

export function stepBack(){
  if(paused){
    toolI = (toolI - 1) % 128
    // console.log(toolPath,toolI)
    tool.setPos(toolPath.at(toolI))
    updateChunks()
  }
}

function updateChunks(){
  let intersects = map.getIntersectingChunks(tool.box)
 
  if(paused){
    console.log(intersects,tool)
  }
  for (let chunk of intersects) {
    chunk.booleanWithTool(tool)
  }
  intersects.forEach((chunk) => {
    chunk.mesh()
  })
}


export async function setup(scene, camera, renderer) {
  
  let chunks = new THREE.Object3D({}) 
  chunks.add(...meshes)
  scene.add(toolMesh)
  scene.add(chunks)
  
}

export function draw(scene, camera, renderer) {
  if(!paused){
    toolI = (toolI +1) % 128
    tool.setPos(toolPath[toolI])
    updateChunks()
  }
}