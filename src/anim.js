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

//circular tool path
// let toolPath = new Array(128).fill().map((_,i) => {
//   return new THREE.Vector3(
//     Math.cos(i * Math.PI * 2 / 128)*(mapSize.x/3)+(mapSize.x/2),
//     mapSize.y-20,
//     Math.sin(i * Math.PI * 2 / 128)*(mapSize.z/3)+(mapSize.z/2),
//   )
// })

// line testing
let toolPath = [
  new THREE.Vector3(16,mapSize.y-16,16),
  new THREE.Vector3(48,mapSize.y-16,16),
  new THREE.Vector3(112,mapSize.y-16,64),
  new THREE.Vector3(48,mapSize.y-16,112),
  new THREE.Vector3(16,mapSize.y-16,112),
]

let paused = false

export function pause(){
  paused = true;
} 

export function unpause(){
  paused = false;
}

export function step(){
  if(paused){
    toolI = (toolI + 1) % toolPath.length
    updateChunks(toolI-1,toolI)
  }
}

export function stepBack(){
  if(paused){
    toolI = (toolI - 1) % toolPath.length
    console.log(toolPath,toolI)
    updateChunks(toolI+1,toolI)
  }
}

//takes 2 vecs and a scalar representing the number of steps
function lerp(a, b, t) {
  const d = b.clone().sub(a)
  const step = d.divideScalar(t)
  const arr = Array(t).fill()
  arr.unshift(a)
  for (let i = 0; i < t; i++) {
    arr[i+1] = (i==0?a:arr[i]).clone().add(step)
  }
  return arr
}

console.log(lerp(new THREE.Vector3(1,2,3),new THREE.Vector3(4,5,6),4))

function updateChunks(oldI,newI){

  let oldPos = toolPath.at(oldI)
  let newPos = toolPath.at(newI)


  tool.setPos(newPos)

  const lerpPoints = lerp(oldPos,newPos,64)

  // console.log(oldPos,newPos)


  for(let point of lerpPoints){
    tool.setPos(point)
    
    let toolBox = tool.box.clone()
    let intersects = map.getIntersectingChunks(toolBox)
   
    if(paused){
      console.log(intersects,tool)
    }
    for (let chunk of intersects) {
      chunk.booleanWithTool(tool)
      chunk.mesh()
  
    }
  }
}


export async function setup(scene, camera, renderer) {
  
  let chunks = new THREE.Object3D({}) 
  chunks.add(...meshes)
  scene.add(toolMesh)
  scene.add(chunks)

  tool.setPos(toolPath.at(toolI))
  
}

export function draw(scene, camera, renderer) {
  if(!paused){
    toolI = (toolI +1) % toolPath.length
    updateChunks(toolI-1,toolI)
  }
}