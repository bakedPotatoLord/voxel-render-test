<script setup>

import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { draw, setup, pause, unpause, step, stepBack } from './anim';
import  { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/addons/libs/stats.module.js';

const canvas = ref(null)


const stats = ref(null)



onMounted(async () => {
  let c = canvas.value
  if (c) {
    let cw = c.width = 600
    let ch = c.height = 600

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, cw/ ch, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    renderer.setSize(cw,ch);
    renderer.setClearColor(0xffffff, 1);


    scene.background = new THREE.Color( "lightblue" );




    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight2.position.set(8, 8, 9);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-8,6,-7);

    const axesHelper = new THREE.AxesHelper( 5 );


    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    
    scene.add(ambient,dirLight,dirLight2,axesHelper);

    camera.position.set(-100,100,-100)

    camera.lookAt(32,32,32)

    let stats = new Stats();
    stats.showPanel( 0 ); 
    document.body.appendChild( stats.dom );
    stats.begin();

    let controls = new OrbitControls(camera,c)

    await setup(scene, camera, renderer)

    function animate() {

      stats.begin();
      draw(scene, camera, renderer)
      renderer.render(scene, camera);
      stats.end();
      requestAnimationFrame(animate);
    }

    animate();
  }
})

</script>

<template>
  <div>

    <canvas ref="canvas"></canvas>
    <div class="controls">
      <button @click="unpause">play</button>
      <button @click="pause">pause</button>
      <button @click="step">step</button>
      <button @click="stepBack">stepBack</button>
    </div>
    <div class="stats" ref="stats"></div>
  </div>
</template>

<style scoped>
canvas {
  border: 2px solid black
}

.controls{
  display:flex;
  
}

.controls button{
  padding: 0.5rem;
  size:1rem;
  margin-right:1rem;
}
</style>
