import VoxelMap from "./VoxelMap";
import * as THREE from "three";
import texture from "./assets/texture/oakMDF.png";
// import vertex from "./shaders/vertex.glsl" with {type: "x-shader/x-vertex"};
// import fragment from "./shaders/fragment.glsl" with {type: "x-shader/x-fragment"};


// let map = new VoxelMap(16, 16, 16);

let textureLoader =  new THREE.TextureLoader()
let textureMap = await textureLoader.loadAsync(texture)

textureMap.matrix.setUvTransform(0, 0, 1, 1,0,1,1 );

const chunkSize = new THREE.Vector3(8,8,8)

const mapSize = new THREE.Vector3(10,8,10)

let map = new VoxelMap(chunkSize,mapSize)

let mat = new THREE.MeshPhongMaterial({
  color:"green",
  side:THREE.DoubleSide,
})

let meshes = map.getObjects(mat)

console.log(meshes)



export async function setup(scene, camera, renderer) {
  
  scene.add(...meshes)
  // scene.add(voxelMesh);

  console.log(scene)

}

export function draw(scene, camera, renderer) {
  
}