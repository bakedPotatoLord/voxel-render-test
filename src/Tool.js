import { Box3, Mesh, Vector3, BufferGeometry, Float32BufferAttribute, Box3Helper } from "three";
import * as THREE from "three";
import ndarray from "ndarray";

export default class Tool {

  #box = new Box3();

  #position = new Vector3();

  constructor() {
    this.height = 30
    this.#position = new Vector3(0,0,0) // bottom center of tool
    //takes tool-relative y and returns radius
    this.radiusFunc= (y)=>{

      if(y<15){
        return 5
      }
      return 10

    };
    this.maxRadius = 11
  }

  toMesh(material){ 
    const geometry = new BufferGeometry();
    const vertices = [];
    const revSegments = 64; // Number of segments for the revolution
    const revSeg = 1/revSegments;

    const ySegs = this.height;

    let lastRadius;

    for (let i = 0; i <= ySegs; i++) { //iterate over y segs

      let radius = this.radiusFunc(i);
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

        vertices.push(bx, aby, bz);
        vertices.push(dx, cdy, dz);
        vertices.push(cx, cdy, cz);
      } 
      lastRadius = radius;
    }

    // top and bottom vars
    let startT,
      startB
    let lastT
    let lastB

    let topRadius = this.radiusFunc(0)

    let bottomRadius = this.radiusFunc(ySegs)

    //make top and bottom
    for(let j =0; j<1;j+=revSeg){

      //x and z from top
      let tx = topRadius * Math.cos(j * Math.PI * 2);
      let tz = topRadius * Math.sin(j * Math.PI * 2);

      //x and z from bottom
      let bx = bottomRadius * Math.cos(j * Math.PI * 2);
      let bz = bottomRadius * Math.sin(j * Math.PI * 2);
      
      if(!startT) {
        startT = new THREE.Vector3(tx, 0, tz);
        startB = new THREE.Vector3(bx, ySegs, bz);
      }else if(!lastT){
        lastT = new THREE.Vector3(tx, 0, tz);
        lastB = new THREE.Vector3(bx, ySegs, bz);
      }else{
        //if enough for a triangle

        //for top
        vertices.push(startT.x, startT.y, startT.z);
        vertices.push(lastT.x, lastT.y, lastT.z);
        vertices.push(tx, 0, tz);
        lastT.setX(tx);
        lastT.setZ(tz);

        //for bottom
        vertices.push(startB.x, startB.y, startB.z);
        vertices.push(bx, ySegs, bz);
        vertices.push(lastB.x, lastB.y, lastB.z);
        lastB.setX(bx);
        lastB.setZ(bz);
      }
    } 

    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    this.mesh = new Mesh(geometry, material)

    let helper = new Box3Helper(this.box, 0xFF0000);
    this.mesh.add(helper);

    const axesHelper = new THREE.AxesHelper( 5 );
    this.mesh.add( axesHelper );

    return this.mesh;

  }

  *makeChunkIntersects(chunks){
    for(let chunk of chunks){
      yield {intersect:this.box.intersect(chunk.box.clone()), chunk}
    }
  }

  *generateCutCircle(box) {
    let {min,max} = box;
    for(let z = min.z; z <= max.z; z++){
      for(let y = min.y; y <= max.y; y++){
        for(let x = min.x; x <= max.x; x++){
          yield new Vector3(x,y,z)
        }
      }

    }
    yield h
  }

  set position(pos) {

    this.#position.set(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
    this.mesh.position.set(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
  }

  get position() {
    return this.#position.clone();
  }

  get box() {
    return new Box3(
      this.position.sub({
        x: this.maxRadius,
        y: 0,
        z: this.maxRadius
      }).floor(),
      this.position.add({
        x: this.maxRadius,
        y: this.height,
        z: this.maxRadius
      }).ceil(),
    )
  }
  
}