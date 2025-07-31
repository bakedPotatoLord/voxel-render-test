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

let mat = new THREE.MeshPhongMaterial({
  color:"#9c886a",
  side:THREE.DoubleSide,
})

let meshes = map.getObjects(mat)

// console.log(meshes)

let tool = new Tool()

let toolMat = new THREE.MeshPhongMaterial({
  color:0x7d7d7d,
  side:THREE.FrontSide,
  transparent: true,
  opacity: 0.8
})

let toolMesh = tool.toMesh(toolMat)

let toolI = 0

let toolPath = new Array(2048).fill().map((_,i) => {
  return new THREE.Vector3(
    Math.cos(i * Math.PI * 2 / 64)*(mapSize.x/4)+(mapSize.x/4),
    mapSize.y-2,
    Math.sin(i * Math.PI * 2 / 64)*(mapSize.z/4)+(mapSize.z/4),
  )
})

let chunks = new THREE.Object3D({}) 
chunks.add(...meshes)


export async function setup(scene, camera, renderer) {
  
  scene.add(toolMesh)
  scene.add(chunks)

  // tool.setPos(toolPath[toolI])
  // toolI = (toolI + 1) % 64
  tool.setPos(new THREE.Vector3(
    8,
    100,
    8,
  ))
  
  let intersects = map.getIntersectingChunks(tool.box)
  
  console.log("intersects",intersects)

  for (let chunk of intersects) {
    chunk.booleanWithTool(tool)
  }

  intersects.forEach((chunk) => {
    chunk.mesh()
  })

  console.log(scene)

}

export function draw(scene, camera, renderer) {
  


}