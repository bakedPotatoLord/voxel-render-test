import { Vector3 } from "three";
import * as THREE from "three";
import Chunk from "./Chunk";

export default class VoxelMap {
  /**
   * @param {Vector3} chunkSize
   * @param {Vector3} fullSize
   */
  constructor(chunkSize, fullSize) {
    this.chunkSize = chunkSize.clone();
    this.fullSize = fullSize;

    //number of chunks in each direction, including partially filled ones

    this.numChunks = new Vector3();
    this.remChunks = new Vector3();

    for (let axis of ["x", "y", "z"]) {
      //set number of chunks including partially filled ones
      this.numChunks[axis] = Math.ceil(fullSize[axis] / chunkSize[axis]);
      //set remainder on each side. this is the number of non-filled voxels
      this.remChunks[axis] = fullSize[axis] % chunkSize[axis];
    }

    let chunkCount = this.numChunks.x * this.numChunks.y * this.numChunks.z;
    this.chunks = Array(chunkCount);
    this.toUpdate = [];

    //init all chunks
    for (let x = 0; x < this.numChunks.x; x++) {
      for (let y = 0; y < this.numChunks.y; y++) {
        for (let z = 0; z < this.numChunks.z; z++) {
          const index =
            x + y * this.numChunks.x + z * this.numChunks.y * this.numChunks.x;
          let chunk = (this.chunks[index] = new Chunk(
            chunkSize,
            new Vector3(x, y, z)
          ));
          chunk.setMap(this);

          let outerX = x == this.numChunks.x - 1 && this.remChunks.x != 0;
          let outerY = y == this.numChunks.y - 1 && this.remChunks.y != 0;
          let outerZ = z == this.numChunks.z - 1 && this.remChunks.z != 0;


          if (outerX || outerY || outerZ) {
            console.log(outerX, outerY, outerZ);
            chunk.forEach((x, y, z) => {
              let ret = !(
                (outerX && x > this.remChunks.x) ||
                (outerY && y > this.remChunks.y) ||
                (outerZ && z > this.remChunks.z)
              );

              chunk.setVoxel(x, y, z, ret ? 1 : 0);
            });

            console.log(chunk);
          } else {
            chunk.fillVoxels(1);
          }
        }
      }
    }
  }


  getObjects(material) {
    return this.chunks.map((chunk) => chunk.toObject(material));
  }

  getIntersectingChunks(box) {
    this.toUpdate = [];
    for (let chunk of this.chunks) {
      if (chunk.box.intersectsBox(box)) {
        this.toUpdate.push(chunk);
      }
    }
    return this.toUpdate;
  }

  updateChunks(){
    this.toUpdate.forEach((chunk) => {
      chunk.mesh()
    })
  }
}
