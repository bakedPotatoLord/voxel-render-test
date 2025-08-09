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

  makeChunkIntersects(chunks){
    let arr = Array(chunks.length)
    let i = 0
    for(let chunk of chunks){
      arr[i] =  {intersect:this.box.intersect(chunk.box.clone()), chunk}
      i++
    }
    return arr
  }

  

  set position(pos) {
    this.#position.set(pos.x, pos.y, pos.z);
    this.mesh.position.set(pos.x, pos.y, pos.z);
  }

  get position() {
    return this.#position.clone().floor();
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
      }).floor(),
    )
  }

  /**
   * Compute swept AABB for tool movement between two positions
   */
  computeSweptAABB(start, end, mapBounds) {
    const startBox = new Box3(
      new Vector3(start.x - this.maxRadius, start.y, start.z - this.maxRadius),
      new Vector3(start.x + this.maxRadius, start.y + this.height, start.z + this.maxRadius)
    );
    const endBox = new Box3(
      new Vector3(end.x - this.maxRadius, end.y, end.z - this.maxRadius),
      new Vector3(end.x + this.maxRadius, end.y + this.height, end.z + this.maxRadius)
    );
    
    const sweepMin = new Vector3(
      Math.min(startBox.min.x, endBox.min.x),
      Math.min(startBox.min.y, endBox.min.y),
      Math.min(startBox.min.z, endBox.min.z)
    );
    const sweepMax = new Vector3(
      Math.max(startBox.max.x, endBox.max.x),
      Math.max(startBox.max.y, endBox.max.y),
      Math.max(startBox.max.z, endBox.max.z)
    );

    // Clamp to map bounds if provided
    if (mapBounds) {
      sweepMin.x = Math.max(0, sweepMin.x);
      sweepMin.y = Math.max(0, sweepMin.y);
      sweepMin.z = Math.max(0, sweepMin.z);
      sweepMax.x = Math.min(mapBounds.x, sweepMax.x);
      sweepMax.y = Math.min(mapBounds.y, sweepMax.y);
      sweepMax.z = Math.min(mapBounds.z, sweepMax.z);
    }

    return { sweepMin, sweepMax };
  }

  /**
   * Test if a voxel should be cut by the swept tool
   */
  testVoxelInSweptPath(voxelPos, start, end) {
    const eps = 1e-9;
    const d = new Vector3().subVectors(end, start);
    const dx = d.x, dy = d.y, dz = d.z;
    
    // Determine valid t-interval for localY
    let tLo = 0, tHi = 1;
    if (Math.abs(dy) < 1e-12) {
      // dy == 0: localY is constant
      const localYConst = voxelPos.y - start.y;
      if (localYConst < 0 || localYConst > this.height) return false;
    } else {
      // dy != 0: solve for t range
      const t1 = (voxelPos.y - start.y - this.height) / dy;
      const t2 = (voxelPos.y - start.y) / dy;
      const tMin = Math.min(t1, t2);
      const tMax = Math.max(t1, t2);
      tLo = Math.max(0, tMin);
      tHi = Math.min(1, tMax);
      if (tLo >= tHi) return false;
    }

    // Collect t-breakpoints
    const tBreaks = [tLo, tHi];
    if (Math.abs(dy) > 1e-12) {
      for (let yy = 0; yy <= this.height; yy++) {
        const tAtY = (voxelPos.y - start.y - yy) / dy;
        if (tAtY > tLo + 1e-12 && tAtY < tHi - 1e-12) {
          tBreaks.push(tAtY);
        }
      }
    }
    
    // Sort and remove duplicates
    tBreaks.sort((a, b) => a - b);
    const cleaned = [];
    for (let val of tBreaks) {
      if (cleaned.length === 0 || Math.abs(val - cleaned[cleaned.length - 1]) > 1e-9) {
        cleaned.push(val);
      }
    }

    // Quadratic coefficients for horizontal squared distance
    const A = dx * dx + dz * dz;
    const B = 2 * ((start.x - voxelPos.x) * dx + (start.z - voxelPos.z) * dz);
    const C = (voxelPos.x - start.x) * (voxelPos.x - start.x) + (voxelPos.z - start.z) * (voxelPos.z - start.z);

    // Test each subinterval
    for (let bi = 0; bi < cleaned.length - 1; bi++) {
      const ta = cleaned[bi];
      const tb = cleaned[bi + 1];
      if (tb <= ta) continue;

      // Determine conservative r_max on [ta,tb]
      const localYa = voxelPos.y - (start.y + ta * dy);
      const localYb = voxelPos.y - (start.y + tb * dy);
      const localYm = voxelPos.y - (start.y + ((ta + tb) * 0.5) * dy);
      
      const ra = this.radiusFunc(localYa);
      const rb = this.radiusFunc(localYb);
      const rm = this.radiusFunc(localYm);
      const rMax = Math.max(ra, rb, rm);

      // Test if Dist^2(t) - rMax^2 <= 0 for some t in [ta,tb]
      const Cprime = C - rMax * rMax;

      if (Math.abs(A) < 1e-12) {
        // Linear case
        const gta = B * ta + Cprime;
        const gtb = B * tb + Cprime;
        if (gta <= 0 || gtb <= 0 || (gta > 0 && gtb < 0) || (gta < 0 && gtb > 0)) {
          return true;
        }
      } else {
        // Quadratic case
        const tStar = -B / (2 * A);
        const evalAt = (t) => A * t * t + B * t + Cprime;
        
        const gta = evalAt(ta);
        const gtb = evalAt(tb);
        let gmin = Math.min(gta, gtb);
        
        if (tStar >= ta && tStar <= tb) {
          const gst = evalAt(tStar);
          gmin = Math.min(gmin, gst);
        }
        
        if (gmin <= 0) return true;
      }
    }
    
    return false;
  }
  
}