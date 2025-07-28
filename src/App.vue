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
    let cw = c.width = 600
    let ch = c.height = 600

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, cw/ ch, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
    renderer.setSize(cw,ch);
    renderer.setClearColor(0xffffff, 1);


    scene.background = new THREE.Color( "lightblue" );

    const light = new THREE.PointLight(0xFFFFFF,10,20,0.1)
    light.position.set(8, 8, 8);
    // scene.add(light);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-8,6,-7);
    scene.add(dirLight);

    const axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );


    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    camera.position.set(-30,30,-30)

    camera.lookAt(0,0,0)

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
  </div>
</template>

<style scoped>
canvas {
  border: 2px solid black
}
</style>
