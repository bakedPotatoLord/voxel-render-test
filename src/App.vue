<script setup>

import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { draw, setup } from './anim';
import  { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/addons/libs/stats.module.js';

const canvas = ref(null)






onMounted(async () => {
  let c = canvas.value
  if (c) {

    console.log(c)

    let cw = c.width = 600
    let ch = c.height = 600

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, cw/ ch, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    renderer.setSize(cw,ch);
    renderer.setClearColor(0xffffff, 1);

    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    const light = new THREE.PointLight(0xFFFFFF,1,0,0.1)
    light.position.set(10, 16, 30);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    camera.position.set(50,50,50)

    camera.lookAt(0,0,0)

    let stats = new Stats();
    c.appendChild( stats.dom );

    let controls = new OrbitControls(camera,c)
   
    

    await setup(scene, camera, renderer)

    function animate() {
      draw(scene, camera, renderer)
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    console.log(scene, camera, renderer)
  }
})

</script>

<template>
  <div>

    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
canvas {
  border: 2px solid black
}
</style>
