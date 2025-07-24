import VoxelMap from "./VoxelMap";
import * as THREE from "three";
import texture from "./assets/texture/oakMDF.png";

let map = new VoxelMap(32, 16, 32);

let textureLoader =  new THREE.TextureLoader()
let textureMap = await textureLoader.loadAsync(texture)

map.forEach((x, y, z, value) => {
  let val = 2 >y && x%2 == 0
  map.setVoxel(x, y, z, val);
});



const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ map: textureMap });
const instanceCount = map.count;

const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
let i = 0;

const dummy = new THREE.Object3D();

map.forEach((x, y, z, value) => {
  if (value) {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i++, dummy.matrix);
  }
})


export async function setup(scene, camera, renderer) {
  
  scene.add(instancedMesh);

}

export function draw(scene, camera, renderer) {
  
}