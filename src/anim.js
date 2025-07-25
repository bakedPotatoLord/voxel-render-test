import VoxelMap from "./VoxelMap";
import * as THREE from "three";
import texture from "./assets/texture/oakMDF.png";
import vertex from "./shaders/vertex.glsl" with {type: "x-shader/x-vertex"};
import fragment from "./shaders/fragment.glsl" with {type: "x-shader/x-fragment"};


let map = new VoxelMap(16, 16, 16);

let textureLoader =  new THREE.TextureLoader()
let textureMap = await textureLoader.loadAsync(texture)

textureMap.matrix.setUvTransform(0, 0, 1, 1,0,1,1 );

console.log(textureMap.matrix) 



map.forEach((x, y, z, value) => {
  map.setVoxel(x, y, z, true);
});


const baseGeometry = new THREE.BoxGeometry(1, 1, 1); // generates 36 vertices



let voxelArr = map.toVertexArray()
const instanceCount = voxelArr.length / 3;
const voxelAttribute = new THREE.InstancedBufferAttribute(voxelArr, 3);

baseGeometry.setAttribute('voxelOffset', voxelAttribute);

const material = new THREE.RawShaderMaterial({
  vertexShader: vertex,
  fragmentShader: fragment,
  glslVersion: THREE.GLSL3,
  side: THREE.DoubleSide,
  uniforms: {
    woodTexture: { value: textureMap },
    uvTransform: { value: textureMap.matrix }
  },
});

const voxelMesh = new THREE.InstancedMesh(baseGeometry, material, instanceCount);
console.log({instanceCount})


export async function setup(scene, camera, renderer) {
  
  scene.add(voxelMesh);

}

export function draw(scene, camera, renderer) {
  
}