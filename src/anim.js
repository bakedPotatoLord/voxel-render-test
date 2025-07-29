import VoxelMap from "./VoxelMap";
import * as THREE from "three";
import texture from "./assets/texture/oakMDF.png";
import Tool from "./Tool";
// import vertex from "./shaders/vertex.glsl" with {type: "x-shader/x-vertex"};
// import fragment from "./shaders/fragment.glsl" with {type: "x-shader/x-fragment"};


let textureLoader =  new THREE.TextureLoader()
let textureMap = await textureLoader.loadAsync(texture)

textureMap.matrix.setUvTransform(0, 0, 1, 1,0,1,1 );

const chunkSize = new THREE.Vector3(8,8,8)

const mapSize = new THREE.Vector3(64,64,64)

let map = new VoxelMap(chunkSize,mapSize)

let mat = new THREE.MeshPhongMaterial({
  color:"green",
  side:THREE.DoubleSide,
})

let meshes = map.getObjects(mat)

console.log(meshes)

let tool = new Tool()

let toolMat = new THREE.MeshPhongMaterial({
  color:"red",
  side:THREE.DoubleSide,
})

let toolMesh = tool.toMesh(toolMat)

let toolI = 0

let toolPath = new Array(2048).fill().map((_,i) => {
  return new THREE.Vector3(
    Math.cos(i * Math.PI * 2 / 64)*(mapSize.x/2)+(mapSize.x/2),
    mapSize.y+2,
    Math.sin(i * Math.PI * 2 / 64)*(mapSize.z/2)+(mapSize.z/2),
  )
})


export async function setup(scene, camera, renderer) {
  
  scene.add(toolMesh)
  scene.add(...meshes)
  // scene.add(voxelMesh);

}

export function draw(scene, camera, renderer) {
  
  toolMesh.position.set(...toolPath[toolI])
  toolI = (toolI + 1) % 64

  let intersects = map.getIntersectingChunks(tool.box)


}