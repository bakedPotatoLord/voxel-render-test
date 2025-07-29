import { Box3, Mesh, Vector3, BufferGeometry, Float32BufferAttribute } from "three";
import * as THREE from "three";

export default class Tool {
  constructor() {
    this.height = 20

    this.pos = new Vector3(0,0,0)

    this.box = new Box3(new THREE.Vector3(-this.width / 2, 0, -this.width / 2), new THREE.Vector3(this.width / 2, this.height, this.width / 2))

    this.widthFunc= (y)=>{
      //takes real height value
      if(y>10) return 10;
      return Math.sin(y)+10
    };
    
  }

  toMesh(material){ 
    const geometry = new BufferGeometry();
    const vertices = [];
    const revSegments = 64; // Number of segments for the revolution
    const revSeg = 1/revSegments;

    const ySegs = 20;

    let lastRadius;

    for (let i = 0; i <= ySegs; i++) { //iterate over y segs

      let radius = this.widthFunc(i);
      if(!lastRadius){
        lastRadius = radius;
        continue;
      }

      //if las last radius, iterate around the circle
      for(let j =0; j<1;j+=revSeg){

        //2 points from current radius
        let ax = radius * Math.cos(j * Math.PI * 2);
        let az = radius * Math.sin(j * Math.PI * 2);
        let bx = radius * Math.cos((j + revSeg) * Math.PI * 2);
        let bz = radius * Math.sin((j + revSeg) * Math.PI * 2);
        let aby = i

        // 2 points from last radius
        let cx = lastRadius * Math.cos(j * Math.PI * 2);
        let cz = lastRadius * Math.sin(j * Math.PI * 2);
        let dx = lastRadius * Math.cos((j + revSeg) * Math.PI * 2);
        let dz = lastRadius * Math.sin((j + revSeg) * Math.PI * 2);
        let cdy = i-1;

        // push vertices
        vertices.push(ax, aby, az);
        vertices.push(bx, aby, bz);
        vertices.push(cx, cdy, cz);

        vertices.push(cx, cdy, cz);
        vertices.push(dx, cdy, dz);
        vertices.push(bx, aby, bz);
      } 

      let startT,
        startB

      let lastT
      let lastB

      let topRadius = this.widthFunc(0)

      let bottomRadius = this.widthFunc(ySegs)

      //make top and bottom
      for(let j =0; j<1;j+=revSeg){

        //x and z from top
        let tx = topRadius * Math.cos(j * Math.PI * 2);
        let tz = topRadius * Math.sin(j * Math.PI * 2);

        //x and z from bottom
        let bx = bottomRadius * Math.cos(j * Math.PI * 2);
        let bz = bottomRadius * Math.sin(j * Math.PI * 2);
        
        if(!startT) {
          startT = new THREE.Vector3(tx, i, tz);
          startB = new THREE.Vector3(bx, i, bz);
        }else if(!lastT){
          lastT = new THREE.Vector3(tx, i, tz);
          lastB = new THREE.Vector3(bx, i, bz);
        }else{
          //if enough for a triangle

          //for top
          vertices.push(startT.x, startT.y, startT.z);
          vertices.push(lastT.x, lastT.y, lastT.z);
          vertices.push(tx, i, tz);
          lastT.setX(tx);
          lastT.setZ(tz);

          //for bottom
          vertices.push(startB.x, startB.y, startB.z);
          vertices.push(bx, i, bz);
          vertices.push(lastB.x, lastB.y, lastB.z);
          lastB.setX(bx);
          lastB.setZ(bz);
        }


      } 

      lastRadius = radius;
    }

    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return new Mesh(geometry, material);

  }

  
}